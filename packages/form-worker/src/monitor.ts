import { MAX_ALERT_ATTEMPTS, sendAlert } from "./alert.ts";
import { deleteContact } from "./brevo.ts";
import type { Env } from "./env.ts";
import { siteOrigin } from "./manifest.ts";
import { plusMinutes } from "./schedules.ts";
import { verifyTurnstile } from "./turnstile.ts";

// Monitoring (ADR-0037). A request signed with MONITOR_SECRET may skip Turnstile and is
// stored as a test Lead: no owner alert, cleaned up after the check.
//   x-msp-test-signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">

export const TEST_SIGNATURE_HEADER = "x-msp-test-signature";
const MAX_SKEW_SECONDS = 300;

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Workers-only (not in Node's WebCrypto), which is fine: only the Worker verifies.
const encoder = new TextEncoder();
const sameText = (a: string, b: string) =>
  a.length === b.length && crypto.subtle.timingSafeEqual(encoder.encode(a), encoder.encode(b));

// The signed test Lead the daily check (kind "daily") and the manual script (kind "manual") send.
export const testLeadBody = (email: string, kind: "daily" | "manual") =>
  JSON.stringify({
    form_id: "monitor",
    form_type: "monitoring",
    submission_token: crypto.randomUUID(),
    fields: { email, name: `${kind === "daily" ? "Daily" : "Manual"} test Lead` },
    honeypot: "",
    turnstile_token: "",
    page_url: `monitor://${kind}`,
    language: "en",
  });

export async function signTestBody(secret: string, body: string, at: Date): Promise<string> {
  const t = Math.floor(at.getTime() / 1000);
  return `t=${t},v1=${await hmac(secret, `${t}.${body}`)}`;
}

export async function isValidTestSignature(header: string, body: string, secret: string | undefined, now: Date) {
  if (!secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1) return false;
  if (Math.abs(now.getTime() / 1000 - t) > MAX_SKEW_SECONDS) return false;
  return sameText(parts.v1, await hmac(secret, `${t}.${body}`));
}

type LeadHandler = (request: Request, env: Env, ctx: Pick<ExecutionContext, "waitUntil">) => Promise<Response>;

// Rejections in a day above which real Visitors may be being refused (a broken widget or key).
// ponytail: one fixed threshold; make it per Client once traffic differs a lot between them.
const TURNSTILE_SPIKE = 25;
// Leads whose alerts ran out of attempts are reported for this many days, then left to the purge.
const UNREPORTED_DAYS = 3;

// The daily check (ADR-0037, audit A3). Each part reports problems; any problem emails the
// owner, and the heartbeat is pinged either way (its /fail URL on problems), so silence
// itself (crons stopped, alerts broken) shows up on healthchecks.io.
export async function runDailyChecks(env: Env, now: Date, handle: LeadHandler): Promise<void> {
  const problems: string[] = [];
  for (const [name, check] of [
    ["test Lead", () => testLeadProblems(env, handle)],
    ["Turnstile secret", () => turnstileSecretProblems(env)],
    ["unreported Leads", () => unreportedLeads(env, now)],
    ["Turnstile rejections", () => turnstileSpike(env, now)],
  ] as const) {
    try {
      problems.push(...(await check()));
    } catch (err) {
      problems.push(`The ${name} check itself failed: ${(err as Error).message}`);
    }
  }

  if (problems.length) {
    await sendAlert(env, "Daily check failed", [
      "The daily check found problems. Real Leads may be affected.",
      "",
      ...problems,
      "",
      `Checked: ${now.toISOString()}`,
    ]);
  }
  if (env.HEARTBEAT_URL) {
    // No body: problem text can quote Brevo errors, and the heartbeat service is outside us.
    await fetch(problems.length ? `${env.HEARTBEAT_URL}/fail` : env.HEARTBEAT_URL).catch((err) =>
      console.error("heartbeat ping failed", err),
    );
  }
}

// The test Lead: sent through the real endpoint handler from the site's own origin (so the
// CORS allow-list is checked too), checked in the Lead Log and Brevo, then removed from both.
async function testLeadProblems(env: Env, handle: LeadHandler): Promise<string[]> {
  if (!env.MONITOR_SECRET || !env.MONITOR_TEST_EMAIL) {
    console.warn("daily test Lead skipped: MONITOR_SECRET or MONITOR_TEST_EMAIL isn't set");
    return [];
  }
  if (!env.BREVO_API_KEY) {
    console.warn("daily test Lead skipped: no Brevo account on this Worker (the preview)");
    return [];
  }
  const body = testLeadBody(env.MONITOR_TEST_EMAIL, "daily");
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void pending.push(p) };
  const request = new Request("https://monitor.internal/lead", {
    method: "POST",
    // Signed at send time, not the cron's scheduled time, so a late cron run still passes.
    headers: {
      "content-type": "application/json",
      origin: siteOrigin,
      [TEST_SIGNATURE_HEADER]: await signTestBody(env.MONITOR_SECRET, body, new Date()),
    },
    body,
  });

  const problems: string[] = [];
  let leadId: string | undefined;
  try {
    const res = await handle(request, env, ctx);
    await Promise.allSettled(pending);
    if (res.ok) leadId = ((await res.json()) as { lead_id: string }).lead_id;
    else if (res.status === 403 && !res.headers.has("access-control-allow-origin")) {
      problems.push(`The site's origin ${siteOrigin} isn't in ALLOWED_ORIGINS, so every real Visitor is refused.`);
    } else problems.push(`The Lead Log write failed (HTTP ${res.status}).`);

    if (leadId) {
      const row = await env.LEAD_LOG.prepare("SELECT delivery_status, delivery_log FROM leads WHERE id = ?")
        .bind(leadId)
        .first<{ delivery_status: string; delivery_log: string }>();
      if (!row) problems.push("The test Lead isn't in the Lead Log.");
      else if (row.delivery_status !== "delivered") {
        const last = (JSON.parse(row.delivery_log) as { detail: string }[]).at(-1)?.detail ?? "no attempt";
        problems.push(`Brevo delivery is "${row.delivery_status}" (${last}).`);
      }
    }
  } catch (err) {
    problems.push(`The test Lead check failed: ${(err as Error).message}`);
  }

  // Clean up whatever the check created, whether or not it passed.
  if (leadId) {
    await env.LEAD_LOG.prepare("DELETE FROM leads WHERE id = ? AND is_test = 1").bind(leadId).run().catch(() => {});
  }
  const removed = await deleteContact(env.BREVO_API_KEY, env.MONITOR_TEST_EMAIL);
  if (!removed.ok && problems.length === 0) console.warn(`daily test contact not removed from Brevo: ${removed.detail}`);
  return problems;
}

// The signed test Lead skips Turnstile, so check the secret itself: siteverify names a wrong
// or missing secret even for a dummy token. An unreachable Turnstile is reported too.
async function turnstileSecretProblems(env: Env): Promise<string[]> {
  const { errors } = await verifyTurnstile("daily-secret-check", env.TURNSTILE_SECRET_KEY, null);
  if (errors.some((e) => e.includes("secret"))) {
    return ["Turnstile rejects our Turnstile secret (TURNSTILE_SECRET_KEY), so every real Visitor is refused."];
  }
  if (errors.some((e) => e === "network" || e.startsWith("http-"))) return [`Turnstile couldn't be reached (${errors.join(", ")}).`];
  return [];
}

// Leads whose new-enquiry or not-delivered alert ran out of attempts: nobody has been told.
async function unreportedLeads(env: Env, now: Date): Promise<string[]> {
  const { results } = await env.LEAD_LOG.prepare(
    `SELECT id FROM leads WHERE is_test = 0 AND created_at >= ? AND (
       (alert_status IS NOT 'sent' AND alert_attempts >= ?)
       OR (delivery_status = 'failed' AND failure_alert_status IS NOT 'sent' AND failure_alert_attempts >= ?))
     ORDER BY created_at`,
  )
    .bind(plusMinutes(now, -UNREPORTED_DAYS * 24 * 60), MAX_ALERT_ATTEMPTS, MAX_ALERT_ATTEMPTS)
    .all<{ id: string }>();
  if (!results.length) return [];
  return [`Leads whose alerts never went out (look them up in the Lead Log): ${results.map((r) => r.id).join(", ")}`];
}

async function turnstileSpike(env: Env, now: Date): Promise<string[]> {
  const day = plusMinutes(now, -24 * 60).slice(0, 10);
  const row = await env.LEAD_LOG.prepare("SELECT count FROM spam_counts WHERE day = ? AND reason = 'turnstile'")
    .bind(day)
    .first<{ count: number }>();
  if (!row || row.count < TURNSTILE_SPIKE) return [];
  return [`${row.count} submissions failed Turnstile on ${day}. If real Visitors are being refused, check the widget and its hostnames.`];
}
