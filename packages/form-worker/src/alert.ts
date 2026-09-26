import type { Env } from "./env.ts";
import type { Submission } from "./submission.ts";

import type { LeadForBrevo } from "./brevo.ts";

// The owner's new-lead alert, sent through Cloudflare Email Routing's send_email binding
// after the Lead Log write, so it never depends on Brevo (ADR-0013, issue 19 #5).
export async function sendOwnerAlert(env: Env, leadId: string, s: Submission, receivedAt: Date): Promise<boolean> {
  return send(env, `New enquiry: ${s.form_type}`, [
    `New ${s.form_type} enquiry from form "${s.form_id}".`,
    "",
    ...Object.entries(s.fields).map(([name, value]) => `${name}: ${value}`),
    "",
    `Page: ${s.page_url ?? "unknown"}`,
    `Received: ${receivedAt.toISOString()}`,
    `Lead ID: ${leadId}`,
  ]);
}

// Sent when Brevo delivery has failed for the last time, so a person can add the Lead by hand.
export async function sendDeliveryFailedAlert(env: Env, lead: LeadForBrevo, lastError: string): Promise<boolean> {
  return send(env, `Lead not delivered to Brevo: ${lead.form_type}`, [
    "Brevo delivery failed for the last time. Add this Lead to Brevo by hand.",
    "",
    ...Object.entries(lead.fields).map(([name, value]) => `${name}: ${value}`),
    "",
    `Last error: ${lastError}`,
    `Received: ${lead.created_at}`,
    `Lead ID: ${lead.id}`,
  ]);
}

export async function sendAlert(env: Env, subject: string, lines: string[]): Promise<boolean> {
  return send(env, subject, lines);
}

async function send(env: Env, subject: string, lines: string[]): Promise<boolean> {
  try {
    await env.OWNER_ALERT.send({ from: env.ALERT_FROM, to: env.ALERT_TO, subject, text: lines.join("\n") });
    return true;
  } catch (err) {
    console.error(`alert "${subject}" failed`, err);
    return false;
  }
}
