---
status: accepted
---

# Consent behaviour follows the Visitor's Region, using an off-the-shelf certified consent tool

We work out the Visitor's country at Cloudflare from their IP address.

**Opt-in Regions** (EEA, UK, Switzerland, Quebec, and any other Region its config marks opt-in):

- A banner appears before any non-essential tag runs.
- GA4, GTM marketing tags, Clarity **and our attribution storage** all wait for consent.
- "Reject all" is as prominent as "Accept all".
- Google Consent Mode runs in **basic** mode: Google tags don't load at all until consent.

**Opt-out Regions** (US states with privacy laws):

- Tags run, with a notice shown.
- A "Your privacy choices" / "Do Not Sell or Share" link is shown.
- A browser's Global Privacy Control signal is treated as an opt-out of advertising and sharing.
- Consent Mode runs in **advanced** mode.

**Other Regions** follow their region config. Visitors from unknown or unlisted Regions get the strictest rules among the Client's Served Regions (ADR-0014).

**The consent tool:**

- We use a certified off-the-shelf tool, configured per Client from region config and Privacy Law Profiles. The tool keeps the consent records.
- **Its per-domain cost is part of the per-Client cost model.**

We rejected building our own consent tool. Certification and keeping consent records are specialist work.

We also rejected advanced Consent Mode in opt-in Regions. Its pings before consent are legally contested in the EU, and the modelled conversions it adds aren't worth that risk.

## Milestone

M1: India behaviour. M2: GB (opt-in) and US/US-CA (opt-out, GPC). See ADR-0039.
