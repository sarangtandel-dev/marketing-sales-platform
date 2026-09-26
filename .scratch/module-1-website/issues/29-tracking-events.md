# 29: Tracking events from site components

**What to build:** Site components are the only source of tracking events. Phone, WhatsApp, SMS and email clicks push one `contact_click` with a `channel`, CTAs push `cta_click` with `cta_type`, and forms push `form_start` and `generate_lead` with `form_type` and form ID. `generate_lead` fires only when the Worker confirms success, so GA4 conversions match stored Leads (ADR-0022, issues 03, 07).

**Blocked by:** 28

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] One contact click pushes exactly one `contact_click` event with the correct `channel`
- [ ] CTA clicks push `cta_click` with the CTA Type from the site definition
- [ ] `form_start` and `generate_lead` carry `form_type` and form ID from the site definition
- [ ] `generate_lead` is pushed only on the Worker's success response, never on a failure or a page load
- [ ] No event parameter carries personal data
- [ ] GTM tags map these events to GA4. `generate_lead` is marked as a conversion
- [ ] Seam 3 tests for each rule above
