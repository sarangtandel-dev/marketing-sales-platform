import { alertsDue, deliverAlert } from "./alert.ts";
import { attemptDelivery, deliverDue } from "./delivery.ts";
import type { Env } from "./env.ts";
import { allowedOrigin, corsHeaders, hostAllowed, json } from "./http.ts";
import { storeLead } from "./lead-log.ts";
import { isValidTestSignature, runDailyTestLead, TEST_SIGNATURE_HEADER } from "./monitor.ts";
import { countSpam, purgeExpiredLeads, type SpamReason } from "./retention.ts";
import { DAILY_CRON } from "./schedules.ts";
import { MAX_BODY_BYTES, parseSubmission } from "./submission.ts";
import { verifyTurnstile } from "./turnstile.ts";

// The form Worker (ADR-0013): spam checks, then the Lead Log write, and only then success.
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    // For the external uptime monitor: checks the Lead Log answers, writes nothing. HEAD works too.
    if (pathname === "/health" && (request.method === "GET" || request.method === "HEAD")) return health(env, request);
    if (pathname !== "/lead") return json({ ok: false, error: "not_found" }, 404);
    return handleLead(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date(controller.scheduledTime);
    if (controller.cron === DAILY_CRON) {
      // Independent jobs: one failing never stops the other.
      await purgeExpiredLeads(env.LEAD_LOG, now).catch((err) => console.error("Lead Log purge failed", err));
      await runDailyTestLead(env, now, handleLead);
    } else {
      await deliverDue(env, now).catch((err) => console.error("delivery retries failed", err));
      await alertsDue(env, now);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleLead(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = allowedOrigin(request, env.ALLOWED_ORIGINS);
  if (origin === false) return json({ ok: false, error: "forbidden" }, 403);
  const cors = corsHeaders(origin);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, cors);

  // Rate limit per IP before reading the body or touching D1 (audit security M1). The edge
  // always sets cf-connecting-ip; in-process calls (the daily check) have none and aren't limited.
  const ip = request.headers.get("cf-connecting-ip");
  if (ip && env.LEAD_RATE_LIMITER && !(await env.LEAD_RATE_LIMITER.limit({ key: ip })).success) {
    return json({ ok: false, error: "rate_limited" }, 429, cors);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json({ ok: false, error: "too_large" }, 413, cors);
  }

  const raw = await request.text();
  const submission = new TextEncoder().encode(raw).length <= MAX_BODY_BYTES ? parseSubmission(raw) : null;
  if (!submission) return json({ ok: false, error: "invalid" }, 400, cors);

  // A monitoring request signed with MONITOR_SECRET replaces the Turnstile check.
  const now = new Date();
  const signature = request.headers.get(TEST_SIGNATURE_HEADER);
  const isTest = signature !== null;
  if (isTest && !(await isValidTestSignature(signature, raw, env.MONITOR_SECRET, now))) {
    return json({ ok: false, error: "forbidden" }, 403, cors);
  }

  // 1. Spam checks. The honeypot is checked first, so bots don't cost a Turnstile call.
  let spam: SpamReason | null = null;
  if (submission.honeypot !== "") spam = "honeypot";
  else if (!isTest) {
    const check = await verifyTurnstile(submission.turnstile_token, env.TURNSTILE_SECRET_KEY, ip);
    // A token solved on another site that shares the widget doesn't count (audit security L2).
    const ours =
      env.TURNSTILE_SKIP_HOSTNAME === "true" || (check.hostname !== undefined && hostAllowed(check.hostname, env.ALLOWED_ORIGINS));
    if (!check.success || !ours) spam = "turnstile";
  }
  if (spam) {
    ctx.waitUntil(countSpam(env.LEAD_LOG, spam, now).catch((err) => console.error("spam count failed", err)));
    return json({ ok: false, error: "rejected" }, 400, cors);
  }

  // 2. Store first. 3. Only then reply with success.
  let lead: { id: string; created: boolean };
  try {
    lead = await storeLead(env.LEAD_LOG, submission, now, isTest, env.CLIENT_SLUG ?? null);
  } catch (err) {
    console.error("Lead Log write failed", err);
    return json({ ok: false, error: "unavailable" }, 503, cors);
  }
  // 4. After the reply: work that must never hold up or change the Visitor's success.
  if (lead.created) ctx.waitUntil(afterReply(env, lead.id));
  return json({ ok: true, lead_id: lead.id }, 200, cors);
}

async function health(env: Env, request: Request): Promise<Response> {
  let ok = true;
  try {
    await env.LEAD_LOG.prepare("SELECT 1").first();
  } catch {
    ok = false;
  }
  const status = ok ? 200 : 503;
  return request.method === "HEAD" ? new Response(null, { status }) : json({ ok }, status);
}

// The owner alert goes first, so it never waits on Brevo (test Leads skip it). Either one
// that doesn't finish here is picked up by the cron.
async function afterReply(env: Env, leadId: string) {
  await deliverAlert(env, "new", leadId, new Date()).catch((err) => console.error("owner alert failed", err));
  await attemptDelivery(env, leadId, new Date());
}
