# 27: Tracking script: attribution without personal data

**What to build:** A new tracking script replaces the Phase 0 snippet. It records first touch and last non-direct touch for 90 days, classifies referrers, captures every click ID, and sends attribution with the form so the Worker stores it in the Lead Log. It never puts personal data in the browser. Until a Consent signal says yes, it stores nothing, so it's safe before the consent tool exists (ADR-0022, issues 01, 02, 04, 05, 14).

**Blocked by:** 22

Status: done

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] Nothing is written to browser storage while Consent is not granted
- [x] Last touch updates on a UTM, a click ID, or an outside referrer, and a direct visit never overwrites it
- [x] Referrers are classified as organic, social or referral from a shared domain list
- [x] `gclid`, `gbraid`, `wbraid`, `msclkid`, `fbclid`, `ttclid`, `li_fat_id` and `twclid` are captured into both first and last touch, from a shared configurable list
- [x] Stored attribution expires after 90 days
- [x] `known_contact` is a flag with an expiry and no contact details. No email, phone or name ever reaches storage or the dataLayer
- [x] Attribution (and the GA client ID when Consent allows) is sent with the form, and the Worker stores it on the Lead Log row
- [x] Seam 3 tests prove each rule above in a browser page

## Comments

2026-09-27: built and checked in a browser against wrangler dev.

- **Package:** `packages/tracking`, loaded on every page by the site layout. The shared click-ID and referrer lists are in `src/sources.ts`.
- **Consent signal:** Google Consent Mode, read from the dataLayer (`gtag("consent", "default" | "update", …)`). That makes the script tool-agnostic, so ticket 28 only has to configure the consent tool.
  - Attribution is stored only once `analytics_storage` is granted. Consent given later on the same page still stores that page's touch.
  - Click IDs also need `ad_storage` (decided here: they're advertising identifiers).
- **Storage:** `localStorage` keys `msp_first_touch`, `msp_last_touch` and `msp_known_contact`, each saved as `{ value, expires }` with a 90-day expiry. An expired entry is replaced.
- **Last touch:** the last non-direct touch, from a UTM, a click ID or an outside referrer. A visit from the same site counts as direct and never overwrites it.
- **No personal data:**
  - the landing page is stored without its query string
  - UTM values that look like an email or phone number are dropped
  - `known_contact` is a boolean with an expiry
- **Form handoff:** `window.msp.attribution()` returns first and last touch plus the GA client ID from the `_ga` cookie, or null without consent. The contact form sends it, and the Worker checks its shape and size (4 KB at most), drops unknown keys, and stores it in `leads.attribution`. `markKnownContact()` runs after a successful enquiry.
- **Tests:**
  - 26 seam 3 tests run the bundled script in jsdom pages with a chosen URL, referrer, stored state and cookie.
  - 3 seam 2 tests cover the Worker's handling of attribution.
  - 1 seam 1 test checks the script is on every page.
- **Browser check:**
  - Nothing was stored before consent.
  - After a Consent Mode update, the UTM values and the gclid were stored.
  - The submitted Lead's row held the same first and last touch, and the known-contact flag was set.
