# 29: Tracking events from site components

**What to build:** Site components are the only source of tracking events. Phone, WhatsApp, SMS and email clicks push one `contact_click` with a `channel`, CTAs push `cta_click` with `cta_type`, and forms push `form_start` and `generate_lead` with `form_type` and form ID. `generate_lead` fires only when the Worker confirms success, so GA4 conversions match stored Leads (ADR-0022, issues 03, 07).

**Blocked by:** 28

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] One contact click pushes exactly one `contact_click` event with the correct `channel`
- [x] CTA clicks push `cta_click` with the CTA Type from the site definition
- [x] `form_start` and `generate_lead` carry `form_type` and form ID from the site definition
- [x] `generate_lead` is pushed only on the Worker's success response, never on a failure or a page load
- [x] No event parameter carries personal data
- [x] GTM tags map these events to GA4. `generate_lead` is marked as a conversion (the mapping is in the container; marking the key event is done in the GA4 UI, see comments)
- [x] Seam 3 tests for each rule above

## Comments

2026-09-27: built and checked in a browser.

- **Event list:** `packages/tracking/src/events.ts` lists every event and its allowed parameters. `msp.event()` drops any other event name or parameter, so personal data can't reach the dataLayer.
- **Clicks:** one delegated listener handles them. A `tel:`, `mailto:`, `sms:` or WhatsApp link (wa.me or api.whatsapp.com) pushes exactly one `contact_click` with its `channel`, plus `cta_type`/`cta_id` if it's a CTA. Any other CTA pushes `cta_click`. The event never carries the phone number or address.
- **Contact form:** pushes `form_start` on the first focus, once per page view. It pushes `generate_lead` only when the Worker confirms success, never on a failure or on page load.
- **GTM container:** a custom-event trigger and a GA4 event tag per event, with dataLayer variables for their parameters. Every tag needs `analytics_storage`. A test checks the container sends exactly the parameters `events.ts` allows.
- **For a person:** in GA4, mark `generate_lead` as a key event (conversion). That's a GA4 property setting, not part of the container.
- **Tests:** 12 seam 3 event tests and 1 container test.
- **Browser check:** `form_start` fired once across two field focuses, the failed submit pushed nothing, and the successful submit pushed exactly one `generate_lead`.
