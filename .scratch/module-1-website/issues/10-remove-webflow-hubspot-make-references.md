# Remove Webflow, HubSpot and Make references

Status: ready-for-agent
Source: file audit, 2026-09-17

## Problem

These still reference the removed tools (ADR-0002):

- `docs/01-tool-stack.md`
- `docs/02-architecture.md`
- `docs/appendix-a-naming-and-utm.md` (naming rows, HubSpot pipeline stages, ownership rows)
- `docs/appendix-b-tracking-spec.md` (§6 Make webhook, §7 HubSpot budget, §9 HubSpot columns, Webflow wording)
- `templates/webflow/*`
- `templates/make/*`
- `templates/gtm/container-spec.md:16-17,41,58-59,63-82`
- `templates/brevo/automations.md`
- `templates/client-intake-form.md:51`
- `templates/legal/privacy-policy-template.md:26,30` (processor list: add Cloudflare Pages/Workers/Turnstile)

Parts worth reusing: the persistence logic, hidden field names, the honeypot, the UTM taxonomy structure, the event list, Consent Mode defaults, the Brevo automations W1/W3/W5/W6, and the QA checklist.

## To decide

Rewrite the docs, or archive them as Phase 0 and write the Module 1 docs fresh.

2026-09-17, milestones (ADR-0039): Milestone M1.
