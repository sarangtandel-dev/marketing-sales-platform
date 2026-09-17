# India-specific and local-only assumptions throughout the templates

Status: ready-for-agent
Source: file audit, 2026-09-17

## Problem

- **UTM vocabulary:** sources `justdial`, `indiamart`, `gbp`, `whatsapp`, and `whatsapp` as a medium (`docs/appendix-a-naming-and-utm.md:38-40`); "monsoon" examples (appendix-a:40, appendix-b:47).
- **Intake form:**
  - GST number (:7)
  - a service area in cities/radius (:8)
  - WhatsApp-first contact (:9, :23, :34)
  - Zoho Mail (:18)
  - testimonials "with area" (:25)
  - JustDial/IndiaMART/Sulekha listings (:32)
  - asks only about EU compliance (:39)
  - has no questions on country, Served Regions, languages or business model
- **Privacy template:** GDPR + DPDP only (`templates/legal/privacy-policy-template.md:3,42`); the under-18 threshold (:46).
- **Tooling defaults:**
  - `.in` domains sent to Namecheap (`docs/01-tool-stack.md:15,42`)
  - Indian WhatsApp BSPs (:104-107)
  - GBP described as "critical for Indian local businesses" (:59)
- **Email and addresses:** a Mon–Sat send window (`templates/brevo/automations.md:7`); `{{PINCODE}}` in JSON-LD (`local-business.html:17`).
- **Examples:** a `+91` E.164 example and "WhatsApp-first clients" (`docs/02-architecture.md:56`).

## To decide

Each item either moves into Region config or Category Pack config, or is removed.

2026-09-17, milestones (ADR-0039): Milestone M1, and more pressing now that India is the M1 Region.
- **Move into the IN region config:**
  - GST as India's business ID label
  - JustDial, IndiaMART and Sulekha as India's listing platforms (a listings audit applies only to local packs in M2)
  - the `+91` phone format
  - WhatsApp's rank in India's channel list
- **Move into the IN pack overlay if one is ever needed:** the monsoon/seasonal examples.
- **Remove from the shared defaults:**
  - `.in` routed to Namecheap (becomes a domain-purchase note)
  - Zoho as the default mailbox
  - the Mon–Sat send window
  - GDPR+DPDP as the only privacy regimes
