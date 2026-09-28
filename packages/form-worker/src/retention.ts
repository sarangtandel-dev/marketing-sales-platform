// Lead Log retention (ADR-0013): entries, including their delivery results, are deleted
// after 90 days. Brevo, owned by the Client, remains the lasting record.
const RETENTION_DAYS = 90;

export async function purgeExpiredLeads(db: D1Database, now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString();
  await db.prepare("DELETE FROM leads WHERE created_at < ?").bind(cutoff).run();
}

export type SpamReason = "honeypot" | "turnstile";

// Counts a rejected submission for the day. Nothing about the submission itself is kept.
export async function countSpam(db: D1Database, reason: SpamReason, now: Date): Promise<void> {
  await db
    .prepare(
      `INSERT INTO spam_counts (day, reason, count) VALUES (?, ?, 1)
       ON CONFLICT (day, reason) DO UPDATE SET count = count + 1`,
    )
    .bind(now.toISOString().slice(0, 10), reason)
    .run();
}
