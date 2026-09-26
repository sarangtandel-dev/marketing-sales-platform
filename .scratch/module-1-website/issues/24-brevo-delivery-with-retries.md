# 24: Brevo delivery with idempotent retries

**What to build:** After replying to the Visitor, the Worker delivers the Lead to Brevo. A scheduled job retries failed or pending deliveries with backoff. Retries never create a duplicate in Brevo. After the final failed attempt, the owner gets a "delivery failed" alert so they can enter the Lead by hand (ADR-0013 step 4, ADR-0036).

**Blocked by:** 23

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] The first delivery attempt runs after the response, and its result is recorded on the Lead Log row with the attempt history
- [x] A scheduled job retries pending or failed rows with backoff, up to a set number of attempts
- [x] Delivery is idempotent on the lead ID: retrying a Lead that already reached Brevo doesn't create a second contact or Lead record
- [x] After the final failure, a "delivery failed" alert goes out through the email binding
- [x] No lead data is put in KV or Queues
- [x] Seam 2 tests with a faked Brevo: success; transient failure then success; permanent failure then alert; retry after partial success creates no duplicate

## Comments

2026-09-27: built.

- **Contact upsert:** a Lead goes to Brevo as a contact upsert keyed by email (`updateEnabled: true`), with the lead ID as an attribute. A retry sends the same upsert, so it can't create a duplicate.
- **Order after the reply:** the owner alert goes first, then the first Brevo attempt.
- **Cron:** runs every 5 minutes and retries what's due, with backoff after each attempt of 1 min, 5 min, 30 min, 2 h and 12 h: 6 attempts over about 14.5 hours.
  - 429, 5xx and network errors are retried.
  - Any other 4xx fails at once.
  - A final failure emails the owner "Lead not delivered to Brevo" with the Lead's details.
- **One sender at a time:** an attempt first claims the row by setting it to `sending` with a 10-minute lease, so the first attempt and the cron never deliver the same Lead twice. A `pending` Lead older than 2 minutes (its first attempt was lost) is picked up by the cron.
- **No email:** a Lead without an email is marked `skipped`.
- **Where the data lives:** everything is read from the Lead Log row, with nothing in KV or Queues (ADR-0013).
- **Tests:** 8 seam 2 tests against a fake Brevo API.
  - Test timeouts are raised to 30s for the Worker package, because each test boots Miniflare.
  - This also covers ticket 23's leftover case: the alert is still sent when Brevo is unreachable.
- **Brevo account setup:** the contact attributes that must exist are listed in `docs/development.md`.
