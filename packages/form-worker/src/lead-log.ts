import type { Submission } from "./submission.ts";

// Writes a Lead to the Lead Log. A resubmission with the same submission token gets
// the lead ID of the first write instead of a new row (the lead ID is the idempotency key).
export async function storeLead(db: D1Database, s: Submission, now: Date): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO leads (id, submission_token, created_at, form_id, form_type, cta_type, fields, language, page_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (submission_token) DO NOTHING`,
    )
    .bind(
      id,
      s.submission_token,
      now.toISOString(),
      s.form_id,
      s.form_type,
      s.cta_type ?? null,
      JSON.stringify(s.fields),
      s.language ?? null,
      s.page_url ?? null,
    )
    .run();
  const row = await db
    .prepare("SELECT id FROM leads WHERE submission_token = ?")
    .bind(s.submission_token)
    .first<{ id: string }>();
  if (!row) throw new Error("Lead Log write not found after insert");
  return row.id;
}
