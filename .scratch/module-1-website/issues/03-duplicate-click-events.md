# Two sources for phone/WhatsApp/CTA click events, and mismatched event names

Status: ready-for-agent
Source: file audit, 2026-09-17

## Problem

- `docs/appendix-b-tracking-spec.md` says GTM click triggers emit `phone_click`, `whatsapp_click` and `cta_click`. But `persistence-snippet.js:156-163` pushes those events itself, and GTM also listens for them as custom events (`templates/gtm/container-spec.md:33-35`). The same click can be counted twice.
- The GTM intent webhook body sends `event:'intent_click'` (`container-spec.md:70-71`), while appendix-b:87 says `whatsapp_click`.
- WhatsApp is hard-coded as the only messaging channel (`persistence-snippet.js:150`).

## To decide

- One source for click events: the site code or GTM, not both.
- A generic `contact_click` event with a `channel` parameter (call, WhatsApp, SMS, email), or one event per channel.

2026-09-17: decided in ADR-0022. Site components are the only event source, and GTM only listens. Contact clicks become `contact_click` with a `channel` parameter.

2026-09-17, milestones (ADR-0039): Milestone M1.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0.**
