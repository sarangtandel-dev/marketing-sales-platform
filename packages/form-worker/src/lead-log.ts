import type { Submission } from "./submission.ts";

// Writes a Lead to the Lead Log. A resubmission with the same submission token gets
// the lead ID of the first write instead of a new row (the lead ID is the idempotency key).
// `created` is false for such a resubmission, so follow-up work runs once per Lead.
export async function storeLead(db: D1Database, s: Submission, now: Date): Promise<{ id: string; created: boolean }> {
  const id = crypto.randomUUID();
  const receivedAt = now.toISOString();
  // The consent record for each Marketing Opt-in (ADR-0021).
  const optIns = s.opt_ins.map((o) => ({
    channel: o.channel,
    wording_version: o.version,
    given_at: receivedAt,
    page_url: s.page_url ?? null,
    form_id: s.form_id,
  }));
  await db
    .prepare(
      `INSERT INTO leads (id, submission_token, created_at, form_id, form_type, cta_type, fields, opt_ins, language, page_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (submission_token) DO NOTHING`,
    )
    .bind(
      id,
      s.submission_token,
      receivedAt,
      s.form_id,
      s.form_type,
      s.cta_type ?? null,
      JSON.stringify(s.fields),
      JSON.stringify(optIns),
      s.language ?? null,
      s.page_url ?? null,
    )
    .run();
  const row = await db
    .prepare("SELECT id FROM leads WHERE submission_token = ?")
    .bind(s.submission_token)
    .first<{ id: string }>();
  if (!row) throw new Error("Lead Log write not found after insert");
  return { id: row.id, created: row.id === id };
}

export async function recordAlert(db: D1Database, id: string, sent: boolean): Promise<void> {
  await db.prepare("UPDATE leads SET alert_status = ? WHERE id = ?").bind(sent ? "sent" : "failed", id).run();
}
