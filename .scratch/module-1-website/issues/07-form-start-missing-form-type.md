# form_start reads a form_type that nothing pushes

Status: ready-for-agent
Source: file audit, 2026-09-17

## Problem

- The GTM `form_start` tag reads `dl.form_type` (`container-spec.md:50`), but no code pushes `form_type` or `form_id` for that event.
- The snippet falls back to Webflow's `data-name` attribute (`persistence-snippet.js:135`).
- The GTM `generate_lead` tag sends no `value` or `currency` (:49).
- `generate_lead` fires when the `/thank-you` page loads, not when the Worker confirms the submission.

## To decide

- The form identity comes from the site definition.
- Whether `generate_lead` fires on the Worker's success response.

Part of the Module 2 handoff contract.

2026-09-17, milestones (ADR-0039): Milestone M1. The form identity comes from the site definition (ADR-0034), and events follow ADR-0022. Covered by the combined contract file (ADR-0036).

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0.**

2026-09-27, build: Implemented in ticket 29 (96fa8c1). Form identity comes from the site definition. `generate_lead` fires only on the Worker's success response. Ready to close once the M0 build is reviewed.
