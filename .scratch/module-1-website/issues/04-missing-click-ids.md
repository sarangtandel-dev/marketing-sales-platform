# Only gclid and fbclid are captured

Status: done
Source: file audit, 2026-09-17

## Problem

- `persistence-snippet.js:19` captures only `gclid` and `fbclid`.
- `msclkid` (Microsoft), `gbraid`/`wbraid` (Google iOS), `ttclid` (TikTok), `li_fat_id` (LinkedIn) and others are lost.
- Click IDs are stored in first touch only (:75-79), never in last touch.

## To decide

- The list of click IDs to capture, and whether it depends on Region or ad platforms in use.
- Whether click IDs belong in last touch as well.

2026-09-17: decided in ADR-0022. A shared list of click IDs, stored in both first and last touch.

2026-09-17, milestones (ADR-0039): Milestone M1.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0.**

2026-09-27, build: Implemented in ticket 27 (b715faa). The shared click-ID list is `packages/tracking/src/sources.ts`, and IDs are stored in both first and last touch. Ready to close once the M0 build is reviewed.
