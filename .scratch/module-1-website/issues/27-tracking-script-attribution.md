# 27: Tracking script: attribution without personal data

**What to build:** A new tracking script replaces the Phase 0 snippet. It records first touch and last non-direct touch for 90 days, classifies referrers, captures every click ID, and sends attribution with the form so the Worker stores it in the Lead Log. It never puts personal data in the browser. Until a Consent signal says yes, it stores nothing, so it's safe before the consent tool exists (ADR-0022, issues 01, 02, 04, 05, 14).

**Blocked by:** 22

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] Nothing is written to browser storage while Consent is not granted
- [ ] Last touch updates on a UTM, a click ID, or an outside referrer, and a direct visit never overwrites it
- [ ] Referrers are classified as organic, social or referral from a shared domain list
- [ ] `gclid`, `gbraid`, `wbraid`, `msclkid`, `fbclid`, `ttclid`, `li_fat_id` and `twclid` are captured into both first and last touch, from a shared configurable list
- [ ] Stored attribution expires after 90 days
- [ ] `known_contact` is a flag with an expiry and no contact details. No email, phone or name ever reaches storage or the dataLayer
- [ ] Attribution (and the GA client ID when Consent allows) is sent with the form, and the Worker stores it on the Lead Log row
- [ ] Seam 3 tests prove each rule above in a browser page
