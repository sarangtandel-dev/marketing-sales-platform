# 26: Lead Log retention and spam count

**What to build:** Lead Log rows are deleted automatically after 90 days, and rejected spam is counted per day without storing its content. This keeps the promise in the privacy policy and shows whether the spam checks are working (ADR-0013).

**Blocked by:** 22

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] A daily scheduled job deletes Lead Log rows older than 90 days, including their delivery results
- [ ] Rejected submissions increment a daily spam count, and no submitted content is kept
- [ ] A documented procedure covers exporting or deleting a single Lead on request (ADR-0011)
- [ ] Seam 2 tests: a 91-day-old row is purged and an 89-day-old row is kept; a spam rejection increments the count and stores nothing
