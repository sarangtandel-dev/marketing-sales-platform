# 28: Consent tool, GTM and GA4

**What to build:** Every Visitor sees an opt-in consent banner before any non-essential tag runs. Google Consent Mode starts denied, in basic mode, so Google tags don't load until Consent. GTM and GA4 load only after opt-in and listen only for the tracking script's events (ADR-0020, issue 19 #1).

**Blocked by:** 21, 27

Status: done

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] The consent tool is chosen against the spec's selection criteria, and the choice and reasons are recorded as a note in ADR-0020
- [x] The banner appears before any non-essential tag. "Reject all" is as prominent as "Accept all", and Consent can be changed later
- [x] Consent Mode defaults to denied in basic mode. GTM and GA4 don't load before opt-in
- [x] The tracking script reads the Consent signal and starts storing attribution only after opt-in
- [x] The site definition holds the consent tool, GTM and GA4 IDs, and no component hard-codes them
- [x] The GTM container has no click triggers of its own. It's exported and kept in the repo as the source of truth
- [x] Seam 3 tests: nothing loads or stores before opt-in; after opt-in the tracking script stores attribution; rejecting keeps everything off

## Comments

2026-09-27: built and checked in a browser.

- **Consent tool:** CookieYes, chosen against the spec's criteria. The comparison, sources, and two points to verify before M1 (GPC handling, and processing locations for DPAs) are in ADR-0020's "M0 consent tool choice" section.
- **Site definition:** `tracking.consent_tool` is `{ provider: "cookieyes", id }`, and only integrated providers are allowed. `tracking.gtm` requires a consent tool.
- **Layout, in this order:**
  1. An inline script sets every Consent Mode default to `denied`.
  2. `window.mspConfig` holds the GTM ID, with `<` escaped.
  3. The consent tool's script.
  No page has a GTM script tag.
- **Tracking script:** loads GTM, once, as soon as `analytics_storage` is granted. That's Consent Mode basic: no Google tag before consent.
- **Withdrawal:** withdrawing consent deletes the stored attribution. Only a change from granted to denied counts. This fixes a bug caught during the build: a returning Visitor's consent can arrive after our script runs, and the first version would have wiped their attribution then.
- **GTM container:** `packages/tracking/gtm/container.json` holds the Google tag, which needs `analytics_storage`, and a GA4 measurement ID variable. Tests check it has only custom-event triggers, that every tag's trigger and variables exist, and that every tag needs consent. Ticket 29 adds the event tags.
- **Tests:** seam 3 has 6 GTM and withdrawal tests plus 4 container tests. Seam 1 has 3 layout tests and 2 validation tests.
- **Browser check:** everything was denied and nothing loaded or stored before consent. After the grant, GTM loaded and attribution was stored; after the withdrawal, storage was cleared.
- **For a person:**
  - Create the CookieYes account and site, turn on Google Consent Mode, and set opt-in for everyone.
  - Import the GTM container and set the GA4 ID.
  - Add all three IDs to Client #0's site definition (ticket 33).
  - Importing the container JSON into GTM has not been tried yet.
