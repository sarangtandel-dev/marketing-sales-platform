import { sendOwnerAlert } from "./alert.ts";
import { attemptDelivery, deliverDue } from "./delivery.ts";
import type { Env } from "./env.ts";
import { allowedOrigin, corsHeaders, json } from "./http.ts";
import { recordAlert, storeLead } from "./lead-log.ts";
import type { Submission } from "./submission.ts";
import { MAX_BODY_BYTES, parseSubmission } from "./submission.ts";
import { verifyTurnstile } from "./turnstile.ts";

// The form Worker (ADR-0013): spam checks, then the Lead Log write, and only then success.
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/lead") return json({ ok: false, error: "not_found" }, 404);

    const origin = allowedOrigin(request, env.ALLOWED_ORIGINS);
    if (origin === false) return json({ ok: false, error: "forbidden" }, 403);
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, cors);

    const raw = await request.text();
    const submission = raw.length <= MAX_BODY_BYTES ? parseSubmission(raw) : null;
    if (!submission) return json({ ok: false, error: "invalid" }, 400, cors);

    // 1. Spam checks. The honeypot is checked first, so bots don't cost a Turnstile call.
    const human =
      submission.honeypot === "" &&
      (await verifyTurnstile(
        submission.turnstile_token,
        env.TURNSTILE_SECRET_KEY,
        request.headers.get("cf-connecting-ip"),
      ));
    if (!human) return json({ ok: false, error: "rejected" }, 400, cors);

    // 2. Store first. 3. Only then reply with success.
    const now = new Date();
    let lead: { id: string; created: boolean };
    try {
      lead = await storeLead(env.LEAD_LOG, submission, now);
    } catch (err) {
      console.error("Lead Log write failed", err);
      return json({ ok: false, error: "unavailable" }, 503, cors);
    }
    // 4. After the reply: work that must never hold up or change the Visitor's success.
    if (lead.created) ctx.waitUntil(afterReply(env, lead.id, submission, now));
    return json({ ok: true, lead_id: lead.id }, 200, cors);
  },

  // Cron (every 5 minutes): Brevo retries that are due.
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    await deliverDue(env, new Date(controller.scheduledTime));
  },
} satisfies ExportedHandler<Env>;

// The owner alert goes first, so it never waits on Brevo.
async function afterReply(env: Env, leadId: string, submission: Submission, receivedAt: Date) {
  const sent = await sendOwnerAlert(env, leadId, submission, receivedAt);
  await recordAlert(env.LEAD_LOG, leadId, sent);
  await attemptDelivery(env, leadId, new Date());
}
