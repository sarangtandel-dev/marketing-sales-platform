# Contact details are stored in browser storage and pushed to the dataLayer

Status: ready-for-agent
Source: file audit, 2026-09-17

## Problem

- On submit, `templates/webflow/persistence-snippet.js:136` writes the Visitor's email and phone to localStorage (`mt_contact`) with no expiry.
- `persistence-snippet.js:156-163` then pushes `contact_email` and `contact_phone` into the dataLayer on every click event. From there they can reach GA4, which Google's terms forbid for personal data, and other tags.

## To decide

- Whether contact details stay in the browser at all. If they do: what TTL, and whether to hash them.
- A rule that no personal data enters the dataLayer. `known_contact` stays a boolean.

2026-09-17: decided in ADR-0022. No personal data goes into browser storage, the dataLayer or GA4. `known_contact` becomes a flag with an expiry and no contact details.

2026-09-17, milestones (ADR-0039): Milestone M1.
