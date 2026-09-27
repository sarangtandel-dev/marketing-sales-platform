import { deliverAlert } from "./alert.ts";
import { type LeadForBrevo, upsertContact } from "./brevo.ts";
import type { Env } from "./env.ts";
import { plusMinutes } from "./schedules.ts";

// Delivery states on a Lead Log row:
//   pending   → written, first attempt not yet made
//   sending   → an attempt holds the row until next_attempt_at (a lease, so the first
//               attempt and the cron never deliver the same Lead at once)
//   retrying  → a temporary failure; try again at next_attempt_at
//   delivered | skipped (no email) | failed (gave up; the owner was alerted)

// Wait after attempt n before attempt n+1. Six attempts over about 14.5 hours.
const BACKOFF_MINUTES = [1, 5, 30, 120, 720];
export const MAX_ATTEMPTS = BACKOFF_MINUTES.length + 1;
const LEASE_MINUTES = 10;
// A pending Lead this old has lost its first attempt (the Worker was stopped mid-way).
const PENDING_GRACE_MINUTES = 2;


type Row = LeadForBrevo & { delivery_attempts: number; delivery_log: string; is_test: number };
type RawRow = Omit<Row, "fields" | "opt_ins"> & { fields: string; opt_ins: string | null };

export async function attemptDelivery(env: Env, id: string, now: Date): Promise<void> {
  const db = env.LEAD_LOG;
  const lease = plusMinutes(now, LEASE_MINUTES);
  const claim = await db
    .prepare(
      `UPDATE leads SET delivery_status = 'sending', next_attempt_at = ?
       WHERE id = ? AND (delivery_status IN ('pending', 'retrying')
         OR (delivery_status = 'sending' AND next_attempt_at <= ?))`,
    )
    .bind(lease, id, now.toISOString())
    .run();
  if (claim.meta.changes !== 1) return;

  const raw = await db
    .prepare(
      `SELECT id, form_id, form_type, fields, opt_ins, page_url, created_at, delivery_attempts, delivery_log, is_test
       FROM leads WHERE id = ?`,
    )
    .bind(id)
    .first<RawRow>();
  if (!raw) return;
  const row: Row = { ...raw, fields: JSON.parse(raw.fields), opt_ins: JSON.parse(raw.opt_ins ?? "[]") };

  if (!row.fields.email) {
    await db
      .prepare("UPDATE leads SET delivery_status = 'skipped', next_attempt_at = NULL WHERE id = ? AND next_attempt_at = ?")
      .bind(id, lease)
      .run();
    return;
  }

  const listId = Number(env.BREVO_MARKETING_LIST_ID) || undefined;
  const result = await upsertContact(env.BREVO_API_KEY, row, listId);
  const attempts = row.delivery_attempts + 1;
  const log = [...JSON.parse(row.delivery_log), { at: now.toISOString(), ok: result.ok, detail: result.detail }];

  let status: "delivered" | "retrying" | "failed";
  let next: string | null = null;
  if (result.ok) status = "delivered";
  else if (result.retryable && attempts < MAX_ATTEMPTS) {
    status = "retrying";
    next = plusMinutes(now, BACKOFF_MINUTES[attempts - 1]);
  } else status = "failed";

  // Only if this attempt still holds its lease: a slower, stale attempt must not overwrite
  // a newer one's result.
  const saved = await db
    .prepare(
      `UPDATE leads SET delivery_status = ?, delivery_attempts = ?, delivery_log = ?, next_attempt_at = ?
       WHERE id = ? AND delivery_status = 'sending' AND next_attempt_at = ?`,
    )
    .bind(status, attempts, JSON.stringify(log), next, id, lease)
    .run();
  if (saved.meta.changes !== 1) return;

  // A test Lead's failure is reported once, by the monitoring check itself (deliverAlert skips test Leads).
  if (status === "failed") await deliverAlert(env, "failure", id, now);
}

// Run by the cron: every Lead whose retry (or lost first attempt) is due.
export async function deliverDue(env: Env, now: Date): Promise<void> {
  const { results } = await env.LEAD_LOG.prepare(
    `SELECT id FROM leads
     WHERE (delivery_status IN ('retrying', 'sending') AND next_attempt_at <= ?)
        OR (delivery_status = 'pending' AND created_at <= ?)
     ORDER BY created_at LIMIT 50`,
  )
    .bind(now.toISOString(), plusMinutes(now, -PENDING_GRACE_MINUTES))
    .all<{ id: string }>();
  for (const { id } of results) await attemptDelivery(env, id, now);
}
