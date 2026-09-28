# Restore the Lead Log

D1 **Time Travel** can put a database back to any minute in the last 30 days (7 days on the Workers Free plan). Use it after a bad migration or a mistaken `DELETE`/`UPDATE`.

A restore replaces the **whole** database. Every Lead written after the restore point is lost unless you save it first. Run every command from `packages/form-worker`.

1. **Stop new writes from being lost.** Note the current time, and export the database as it is now:
   ```bash
   pnpm exec wrangler d1 export lead-log-<slug> --remote --output before-restore.sql
   ```
   This file holds personal data. Keep it outside the repo, and delete it at the end.

2. **Find the restore point** (a Unix timestamp or RFC 3339, before the mistake):
   ```bash
   pnpm exec wrangler d1 time-travel info lead-log-<slug> --timestamp 2026-10-01T09:30:00Z
   ```

3. **Restore:**
   ```bash
   pnpm exec wrangler d1 time-travel restore lead-log-<slug> --timestamp 2026-10-01T09:30:00Z
   ```
   It prints a bookmark for the state just before the restore, so the restore itself can be undone with `--bookmark`.

4. **Put back the Leads written after the restore point.** In `before-restore.sql`, find the `INSERT INTO leads` rows with `created_at` after the restore point, and run them:
   ```bash
   pnpm exec wrangler d1 execute lead-log-<slug> --remote --file newer-leads.sql
   ```

5. **Check:**
   - `/health` answers
   - the latest Leads are there
   - the next cron run picks up anything still `pending` or `retrying`

6. **Delete** `before-restore.sql` and `newer-leads.sql`, and record the restore in the incident log ([incident.md](incident.md)).

A restore can bring back rows that an erasure request deleted after the restore point. Re-run those deletions ([lead-data-requests.md](lead-data-requests.md)) before you finish.
