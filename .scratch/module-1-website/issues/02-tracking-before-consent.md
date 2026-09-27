# Attribution is stored before consent

Status: done
Source: file audit, 2026-09-17

## Problem

- `persistence-snippet.js` writes first-touch and last-touch data (UTMs, click IDs, referrer) to storage when the page loads, before any consent check.
- `templates/legal/privacy-policy-template.md:20` says consent through the banner applies "where cookies are used", which contradicts the snippet.

## To decide

- Whether attribution storage waits for consent in Served Regions that require it (the GDPR/ePrivacy regions) and runs freely elsewhere.
- How this interacts with Consent Mode v2 defaults (`docs/appendix-b-tracking-spec.md:36`).

Depends on the privacy and consent-by-region round.

2026-09-17: decided in ADR-0020 and ADR-0022. In opt-in Regions, attribution storage waits for consent.

2026-09-17, milestones (ADR-0039): Milestone M1.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0.**

2026-09-27, build: Implemented in tickets 27 and 28 (b715faa, f9a86bd). Nothing is stored until Consent Mode grants `analytics_storage`, and click IDs also need `ad_storage`. GTM loads only after consent. Ready to close once the M0 build is reviewed.
