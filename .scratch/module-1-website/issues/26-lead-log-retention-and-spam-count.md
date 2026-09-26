# 26: Lead Log retention and spam count

**What to build:** Lead Log rows are deleted automatically after 90 days, and rejected spam is counted per day without storing its content. This keeps the promise in the privacy policy and shows whether the spam checks are working (ADR-0013).

**Blocked by:** 22

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] A daily scheduled job deletes Lead Log rows older than 90 days, including their delivery results
- [x] Rejected submissions increment a daily spam count, and no submitted content is kept
- [x] A documented procedure covers exporting or deleting a single Lead on request (ADR-0011)
- [x] Seam 2 tests: a 91-day-old row is purged and an 89-day-old row is kept; a spam rejection increments the count and stores nothing

## Comments

2026-09-27: built.

- **Purge:** a second cron (`17 3 * * *`, daily) deletes Lead Log rows whose `created_at` is more than 90 days ago. The 5-minute cron only handles Brevo retries. The schedules live in `src/schedules.ts`, because a Worker's main module may only export handlers.
- **Spam count:** `spam_counts` (migration 0002) keeps a count per day and reason (`honeypot`, `turnstile`), and nothing else.
- **Data requests:** the procedure is in `docs/procedures/lead-data-requests.md`: find, export, delete and record, using `wrangler d1`.
- **Tests:** 3 seam 2 tests.
