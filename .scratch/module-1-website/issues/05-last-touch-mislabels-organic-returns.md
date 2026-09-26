# Last touch records returning organic/referral visits as (direct)

Status: ready-for-agent
Source: file audit, 2026-09-17

## Problem

- `persistence-snippet.js:82-89` updates last touch only when UTMs are present.
- Otherwise it falls back to `(direct)/(none)`, even when the referrer is a search engine or another site.
- A return visit carrying only a `gclid` is also missed.
- Last touch lives in sessionStorage, so it is lost when the tab closes.

## To decide

- Referrer-based classification into organic, referral and social.
- Whether last touch should outlive the session.

2026-09-17: decided in ADR-0022. Last touch becomes last non-direct and is kept for 90 days, with referrers classified from a shared domain list.

2026-09-17, milestones (ADR-0039): Milestone M1.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0.**
