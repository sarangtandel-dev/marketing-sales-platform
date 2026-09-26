import type { Env } from "./env.ts";
import type { Submission } from "./submission.ts";

// The owner's new-lead alert, sent through Cloudflare Email Routing's send_email binding
// after the Lead Log write, so it never depends on Brevo (ADR-0013, issue 19 #5).
export async function sendOwnerAlert(env: Env, leadId: string, s: Submission, receivedAt: Date): Promise<boolean> {
  const lines = [
    `New ${s.form_type} enquiry from form "${s.form_id}".`,
    "",
    ...Object.entries(s.fields).map(([name, value]) => `${name}: ${value}`),
    "",
    `Page: ${s.page_url ?? "unknown"}`,
    `Received: ${receivedAt.toISOString()}`,
    `Lead ID: ${leadId}`,
  ];
  try {
    await env.OWNER_ALERT.send({
      from: env.ALERT_FROM,
      to: env.ALERT_TO,
      subject: `New enquiry: ${s.form_type}`,
      text: lines.join("\n"),
    });
    return true;
  } catch (err) {
    console.error("owner alert failed", err);
    return false;
  }
}
