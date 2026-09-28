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
// Control characters never reach an email subject or line (audit security M2).
const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ");

// The last Brevo error, if the log can still be read.
function lastError(lead: AlertRow): string {
  try {
    return (JSON.parse(lead.delivery_log) as { detail: string }[]).at(-1)?.detail ?? "unknown";
  } catch {
    return "unknown";
  }
}

function message(kind: Kind, lead: AlertRow): { subject: string; lines: string[] } {
  if (kind === "new") {
    return {
      subject: `New enquiry: ${clean(lead.form_type)}`,
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
  return {
    subject: `Lead not delivered to Brevo: ${clean(lead.form_type)}`,
    lines: ["Brevo delivery failed for the last time. Add this Lead to Brevo by hand.", "", ...failureLines(lead)],
  };
}

const failureLines = (lead: AlertRow) => [
  ...fieldLines(lead.fields),
  "",
  `Last error: ${lastError(lead)}`,
  `Received: ${lead.created_at}`,
  `Lead ID: ${lead.id}`,
];

// Several Leads failing in one cron run (Brevo down, a revoked key) make one email, not a flood.
function digest(leads: AlertRow[]): { subject: string; lines: string[] } {
  return {
    subject: `${leads.length} Leads not delivered to Brevo`,
    lines: [
      "Brevo delivery failed for the last time for these Leads. Add them to Brevo by hand.",
      ...leads.flatMap((lead) => ["", "----", ...failureLines(lead)]),
    ],
  };
}

// Claims the alert with a lease, so the first try and the cron never both send it. The
// attempt is counted as it's claimed, so an alert that throws still runs out (audit code B14).
// Returns the lease, or null if another run holds the alert or it's done. Test Leads never alert.
async function claim(env: Env, kind: Kind, id: string, now: Date): Promise<string | null> {
  const c = COLUMNS[kind];
  const lease = plusMinutes(now, LEASE_MINUTES);
  const claimed = await env.LEAD_LOG.prepare(
    `UPDATE leads SET ${c.status} = 'sending', ${c.lease} = ?, ${c.attempts} = ${c.attempts} + 1
     WHERE id = ? AND is_test = 0 AND ${c.attempts} < ?
       ${kind === "failure" ? "AND delivery_status = 'failed'" : ""}
       AND (${c.status} IS NULL OR ${c.status} = 'failed' OR (${c.status} = 'sending' AND ${c.lease} <= ?))`,
  )
    .bind(lease, id, MAX_ALERT_ATTEMPTS, now.toISOString())
    .run();
  return claimed.meta.changes === 1 ? lease : null;
}

async function load(env: Env, id: string): Promise<AlertRow | null> {
  const raw = await env.LEAD_LOG.prepare(
    "SELECT id, form_id, form_type, fields, page_url, created_at, delivery_log FROM leads WHERE id = ?",
  )
    .bind(id)
    .first<Omit<AlertRow, "fields"> & { fields: string }>();
  return raw && { ...raw, fields: JSON.parse(raw.fields) };
}

// Records the result only while this run still holds the lease, so a slow, stale run
// can't overwrite a newer one's.
async function finish(env: Env, kind: Kind, id: string, lease: string, sent: boolean): Promise<void> {
  const c = COLUMNS[kind];
  await env.LEAD_LOG.prepare(
    `UPDATE leads SET ${c.status} = ?, ${c.lease} = NULL WHERE id = ? AND ${c.status} = 'sending' AND ${c.lease} = ?`,
  )
    .bind(sent ? "sent" : "failed", id, lease)
    .run();
}

export async function deliverAlert(env: Env, kind: Kind, id: string, now: Date): Promise<void> {
  const lease = await claim(env, kind, id, now);
  if (!lease) return;
  const lead = await load(env, id);
  if (!lead) return;
  const { subject, lines } = message(kind, lead);
  await finish(env, kind, id, lease, await sendAlert(env, subject, lines));
}

// Run by the cron: alerts that failed, lost their first try, or were left mid-send.
// One bad row never stops the rest; its lease expires and it's tried again.
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

    if (kind === "new") {
      for (const { id } of results) {
        await deliverAlert(env, kind, id, now).catch((err) => console.error(`alert for ${id} failed`, err));
      }
      continue;
    }

    const claimed: { lead: AlertRow; lease: string }[] = [];
    for (const { id } of results) {
      try {
        const lease = await claim(env, kind, id, now);
        const lead = lease && (await load(env, id));
        if (lease && lead) claimed.push({ lead, lease });
      } catch (err) {
        console.error(`failure alert for ${id} failed`, err);
      }
    }
    if (!claimed.length) continue;
    const { subject, lines } = claimed.length === 1 ? message(kind, claimed[0].lead) : digest(claimed.map((x) => x.lead));
    const sent = await sendAlert(env, subject, lines);
    for (const { lead, lease } of claimed) {
      await finish(env, kind, lead.id, lease, sent).catch((err) => console.error(`recording alert for ${lead.id} failed`, err));
    }
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
