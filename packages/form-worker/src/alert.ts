import type { LeadForBrevo } from "./brevo.ts";
import { plusMinutes } from "./schedules.ts";
import type { Env } from "./env.ts";

// Alerts to the owner, sent through Cloudflare Email Routing's send_email binding so they
// never depend on Brevo (ADR-0013, issue 19 #5). Two kinds, each recorded on the Lead Log
// row and retried by the cron until sent (at most MAX_ALERT_ATTEMPTS times):
//   new     → "New enquiry", for every non-test Lead
//   failure → "Lead not delivered to Brevo", when delivery has failed for the last time

export const MAX_ALERT_ATTEMPTS = 5;
const LEASE_MINUTES = 5;
// A Lead whose alert still hasn't started this long after arriving lost its first try.
const GRACE_MINUTES = 2;

type Kind = "new" | "failure";
const COLUMNS = {
  new: { status: "alert_status", attempts: "alert_attempts", lease: "alert_lease" },
  failure: { status: "failure_alert_status", attempts: "failure_alert_attempts", lease: "failure_alert_lease" },
} as const;

type AlertRow = Omit<LeadForBrevo, "opt_ins"> & { delivery_log: string };

const fieldLines = (fields: Record<string, string>) => Object.entries(fields).map(([k, v]) => `${k}: ${v}`);

function message(kind: Kind, lead: AlertRow): { subject: string; lines: string[] } {
  if (kind === "new") {
    return {
      subject: `New enquiry: ${lead.form_type}`,
      lines: [
        `New ${lead.form_type} enquiry from form "${lead.form_id}".`,
        "",
        ...fieldLines(lead.fields),
        "",
        `Page: ${lead.page_url ?? "unknown"}`,
        `Received: ${lead.created_at}`,
        `Lead ID: ${lead.id}`,
      ],
    };
  }
  const last = (JSON.parse(lead.delivery_log) as { detail: string }[]).at(-1)?.detail ?? "unknown";
  return {
    subject: `Lead not delivered to Brevo: ${lead.form_type}`,
    lines: [
      "Brevo delivery failed for the last time. Add this Lead to Brevo by hand.",
      "",
      ...fieldLines(lead.fields),
      "",
      `Last error: ${last}`,
      `Received: ${lead.created_at}`,
      `Lead ID: ${lead.id}`,
    ],
  };
}

// Claims the alert with a lease (so the first try and the cron never both send it),
// sends it, and records the result. Test Leads never alert.
export async function deliverAlert(env: Env, kind: Kind, id: string, now: Date): Promise<void> {
  const c = COLUMNS[kind];
  const db = env.LEAD_LOG;
  const claim = await db
    .prepare(
      `UPDATE leads SET ${c.status} = 'sending', ${c.lease} = ?
       WHERE id = ? AND is_test = 0 AND ${c.attempts} < ?
         ${kind === "failure" ? "AND delivery_status = 'failed'" : ""}
         AND (${c.status} IS NULL OR ${c.status} = 'failed' OR (${c.status} = 'sending' AND ${c.lease} <= ?))`,
    )
    .bind(plusMinutes(now, LEASE_MINUTES), id, MAX_ALERT_ATTEMPTS, now.toISOString())
    .run();
  if (claim.meta.changes !== 1) return;

  const raw = await db
    .prepare("SELECT id, form_id, form_type, fields, page_url, created_at, delivery_log FROM leads WHERE id = ?")
    .bind(id)
    .first<Omit<AlertRow, "fields"> & { fields: string }>();
  if (!raw) return;
  const lead: AlertRow = { ...raw, fields: JSON.parse(raw.fields) };
  const { subject, lines } = message(kind, lead);
  const sent = await sendAlert(env, subject, lines);
  await db
    .prepare(`UPDATE leads SET ${c.status} = ?, ${c.attempts} = ${c.attempts} + 1, ${c.lease} = NULL WHERE id = ?`)
    .bind(sent ? "sent" : "failed", id)
    .run();
}

// Run by the cron: alerts that failed, lost their first try, or were left mid-send.
export async function alertsDue(env: Env, now: Date): Promise<void> {
  for (const kind of ["new", "failure"] as const) {
    const c = COLUMNS[kind];
    const { results } = await env.LEAD_LOG.prepare(
      `SELECT id FROM leads
       WHERE is_test = 0 AND ${c.attempts} < ? ${kind === "failure" ? "AND delivery_status = 'failed'" : ""}
         AND ((${c.status} IS NULL AND created_at <= ?) OR ${c.status} = 'failed'
              OR (${c.status} = 'sending' AND ${c.lease} <= ?))
       ORDER BY created_at LIMIT 50`,
    )
      .bind(MAX_ALERT_ATTEMPTS, plusMinutes(now, -GRACE_MINUTES), now.toISOString())
      .all<{ id: string }>();
    for (const { id } of results) await deliverAlert(env, kind, id, now);
  }
}

export async function sendAlert(env: Env, subject: string, lines: string[]): Promise<boolean> {
  try {
    await env.OWNER_ALERT.send({ from: env.ALERT_FROM, to: env.ALERT_TO, subject, text: lines.join("\n") });
    return true;
  } catch (err) {
    console.error(`alert "${subject}" failed`, err);
    return false;
  }
}
