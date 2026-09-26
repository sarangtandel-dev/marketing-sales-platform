import { sendOwnerAlert } from "./alert.ts";
import { attemptDelivery, deliverDue } from "./delivery.ts";
import type { Env } from "./env.ts";
import { allowedOrigin, corsHeaders, json } from "./http.ts";
import { recordAlert, storeLead } from "./lead-log.ts";
import { isValidTestSignature, runDailyTestLead, TEST_SIGNATURE_HEADER } from "./monitor.ts";
import { countSpam, purgeExpiredLeads, type SpamReason } from "./retention.ts";
import { DAILY_CRON } from "./schedules.ts";
import type { Submission } from "./submission.ts";
import { MAX_BODY_BYTES, parseSubmission } from "./submission.ts";
import { verifyTurnstile } from "./turnstile.ts";

// The form Worker (ADR-0013): spam checks, then the Lead Log write, and only then success.
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    // For the external uptime monitor: answers without touching anything.
    if (pathname === "/health" && request.method === "GET") return json({ ok: true }, 200);
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
      await deliverDue(env, now);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleLead(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = allowedOrigin(request, env.ALLOWED_ORIGINS);
  if (origin === false) return json({ ok: false, error: "forbidden" }, 403);
  const cors = corsHeaders(origin);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, cors);

  const raw = await request.text();
  const submission = raw.length <= MAX_BODY_BYTES ? parseSubmission(raw) : null;
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
  else if (
    !isTest &&
    !(await verifyTurnstile(submission.turnstile_token, env.TURNSTILE_SECRET_KEY, request.headers.get("cf-connecting-ip")))
  )
    spam = "turnstile";
  if (spam) {
    ctx.waitUntil(countSpam(env.LEAD_LOG, spam, now).catch((err) => console.error("spam count failed", err)));
    return json({ ok: false, error: "rejected" }, 400, cors);
  }

  // 2. Store first. 3. Only then reply with success.
  let lead: { id: string; created: boolean };
  try {
    lead = await storeLead(env.LEAD_LOG, submission, now, isTest);
  } catch (err) {
    console.error("Lead Log write failed", err);
    return json({ ok: false, error: "unavailable" }, 503, cors);
  }
  // 4. After the reply: work that must never hold up or change the Visitor's success.
  if (lead.created) ctx.waitUntil(afterReply(env, lead.id, submission, now, isTest));
  return json({ ok: true, lead_id: lead.id }, 200, cors);
}

// The owner alert goes first, so it never waits on Brevo. Test Leads skip the alert.
async function afterReply(env: Env, leadId: string, submission: Submission, receivedAt: Date, isTest: boolean) {
  if (!isTest) {
    const sent = await sendOwnerAlert(env, leadId, submission, receivedAt);
    await recordAlert(env.LEAD_LOG, leadId, sent);
  }
  await attemptDelivery(env, leadId, new Date());
}
