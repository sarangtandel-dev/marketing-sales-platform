# 24: Brevo delivery with idempotent retries

**What to build:** After replying to the Visitor, the Worker delivers the Lead to Brevo. A scheduled job retries failed or pending deliveries with backoff. Retries never create a duplicate in Brevo. After the final failed attempt, the owner gets a "delivery failed" alert so they can enter the Lead by hand (ADR-0013 step 4, ADR-0036).

**Blocked by:** 23

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The first delivery attempt runs after the response, and its result is recorded on the Lead Log row with the attempt history
- [ ] A scheduled job retries pending or failed rows with backoff, up to a set number of attempts
- [ ] Delivery is idempotent on the lead ID: retrying a Lead that already reached Brevo doesn't create a second contact or Lead record
- [ ] After the final failure, a "delivery failed" alert goes out through the email binding
- [ ] No lead data is put in KV or Queues
- [ ] Seam 2 tests with a faked Brevo: success; transient failure then success; permanent failure then alert; retry after partial success creates no duplicate
