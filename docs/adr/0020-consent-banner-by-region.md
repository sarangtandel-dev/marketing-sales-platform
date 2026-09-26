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

## M0 consent tool choice (ticket 28, 2026-09-27)

**Chosen: CookieYes.** It was checked against the M0 spec's selection criteria:

| Criterion | CookieYes |
|---|---|
| Google-certified CMP for Consent Mode v2, basic mode | Yes, a certified CMP partner |
| Blocks non-essential scripts until opt-in, lets Visitors withdraw | Automatic cookie blocking; banner with reject and preferences |
| Keeps consent records | Consent log, included on the free plan |
| Per-Region rules later (opt-in/opt-out, GPC) for M1 | Geo-targeted banners on paid plans. **Verify GPC handling before M1** |
| Processing locations and sub-processor list, for M1 DPAs | **Verify from CookieYes's DPA before M1** |
| Per-domain pricing fits a per-Client cost model | Free (5,000 pageviews a month, 100 pages per scan), then about $10–55 a month per domain |
| Light enough | One script tag |

**Alternative:** Cookiebot, which scans more deeply. Its free plan covers only 50 subpages, and paid plans cost about twice as much.

**Sources:**
- [Google's CMP partner program](https://cmppartnerprogram.withgoogle.com/)
- [Cookiebot vs CookieYes, 2026](https://www.enzuzo.com/blog/cookiebot-vs-cookieyes)
- [CookieYes pricing, 2026](https://www.consentstack.io/blog/cookieyes-pricing)

All three were read on 2026-09-27; check current pricing when the account is created.

**How it's wired, tool-agnostically:**
1. An inline script in `<head>` sets every Consent Mode default to `denied`.
2. The consent tool's script updates consent through `gtag("consent", "update", …)`.
3. The tracking script reads that from the dataLayer, and loads GTM only once `analytics_storage` is granted. That's basic mode: no Google tag loads before consent.
4. Withdrawing consent deletes the stored attribution.

A different tool can replace CookieYes by adding a `provider` to the site definition schema and the layout.

**Before launch, done by a person:**
- In the CookieYes dashboard, turn on Google Consent Mode.
- Set the banner to opt-in for every Visitor, with "Reject all" as prominent as "Accept all".

## Milestone

M0: an off-the-shelf consent tool, configured by hand as opt-in for every Visitor, with Consent Mode in basic mode (issue 19). M1: region-driven behaviour. M2: GB and US behaviour, unless the first paying Client needs them. See ADR-0039.
