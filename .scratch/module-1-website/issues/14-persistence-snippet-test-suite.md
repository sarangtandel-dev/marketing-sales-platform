# Automated tests for the rewritten attribution script

Status: done
Source: ADR-0022, 2026-09-17

## Problem

`templates/webflow/persistence-snippet.js` has no automated tests. Phase 0 checked it by hand with the checklist in `docs/appendix-b-tracking-spec.md` §10.

## Acceptance

The rewritten script ships with tests proving these rules:

- In an opt-in Region, nothing is written to storage before consent.
- Last touch updates on a UTM, a click ID, or an outside referrer, and a direct visit never overwrites it.
- Referrers are classified as organic, social or referral.
- Every click ID in the shared list is captured in both first and last touch.
- Stored attribution expires after 90 days.
- No email, phone or name ever reaches the dataLayer or browser storage.
- Contact clicks push exactly one `contact_click` event with the right `channel`.

Build when the version 1 spec is written. No code during design.

2026-09-17, milestones (ADR-0039): Milestone M1.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0.**

2026-09-27, build: Implemented in ticket 27 (b715faa). The seam 3 tests (`packages/tracking/src/*.test.ts`) cover every acceptance rule listed here, in jsdom pages running the bundled script. Ready to close once the M0 build is reviewed.
