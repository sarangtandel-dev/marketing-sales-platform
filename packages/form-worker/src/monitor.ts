import { sendAlert } from "./alert.ts";
import { deleteContact } from "./brevo.ts";
import type { Env } from "./env.ts";

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

const sameText = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

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

type LeadHandler = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;

// The daily test Lead: sent through the real endpoint handler, checked in the Lead Log and
// Brevo, then removed from both. Any failure emails the owner.
export async function runDailyTestLead(env: Env, now: Date, handle: LeadHandler): Promise<void> {
  if (!env.MONITOR_SECRET || !env.MONITOR_TEST_EMAIL) {
    console.warn("daily test Lead skipped: MONITOR_SECRET or MONITOR_TEST_EMAIL isn't set");
    return;
  }
  const body = JSON.stringify({
    form_id: "monitor",
    form_type: "monitoring",
    submission_token: crypto.randomUUID(),
    fields: { email: env.MONITOR_TEST_EMAIL, name: "Daily test Lead" },
    honeypot: "",
    turnstile_token: "",
    page_url: "monitor://daily",
    language: "en",
  });
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => pending.push(p), passThroughOnException() {} } as ExecutionContext;
  const request = new Request("https://monitor.internal/lead", {
    method: "POST",
    headers: { "content-type": "application/json", [TEST_SIGNATURE_HEADER]: await signTestBody(env.MONITOR_SECRET, body, now) },
    body,
  });

  const problems: string[] = [];
  let leadId: string | undefined;
  try {
    const res = await handle(request, env, ctx);
    await Promise.allSettled(pending);
    if (res.ok) leadId = ((await res.json()) as { lead_id: string }).lead_id;
    else problems.push(`The Lead Log write failed (HTTP ${res.status}).`);

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
    problems.push(`The check itself failed: ${(err as Error).message}`);
  }

  // Clean up whatever the check created, whether or not it passed.
  if (leadId) {
    await env.LEAD_LOG.prepare("DELETE FROM leads WHERE id = ? AND is_test = 1").bind(leadId).run().catch(() => {});
  }
  const removed = await deleteContact(env.BREVO_API_KEY, env.MONITOR_TEST_EMAIL);
  if (!removed.ok && problems.length === 0) console.warn(`daily test contact not removed from Brevo: ${removed.detail}`);

  if (problems.length) {
    await sendAlert(env, "Daily test Lead failed", [
      "The daily test Lead didn't make it all the way through. Real Leads may be affected.",
      "",
      ...problems,
      "",
      `Checked: ${now.toISOString()}`,
    ]);
  }
}
