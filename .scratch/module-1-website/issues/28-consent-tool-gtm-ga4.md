# 28: Consent tool, GTM and GA4

**What to build:** Every Visitor sees an opt-in consent banner before any non-essential tag runs. Google Consent Mode starts denied, in basic mode, so Google tags don't load until Consent. GTM and GA4 load only after opt-in and listen only for the tracking script's events (ADR-0020, issue 19 #1).

**Blocked by:** 21, 27

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The consent tool is chosen against the spec's selection criteria, and the choice and reasons are recorded as a note in ADR-0020
- [ ] The banner appears before any non-essential tag. "Reject all" is as prominent as "Accept all", and Consent can be changed later
- [ ] Consent Mode defaults to denied in basic mode. GTM and GA4 don't load before opt-in
- [ ] The tracking script reads the Consent signal and starts storing attribution only after opt-in
- [ ] The site definition holds the consent tool, GTM and GA4 IDs, and no component hard-codes them
- [ ] The GTM container has no click triggers of its own. It's exported and kept in the repo as the source of truth
- [ ] Seam 3 tests: nothing loads or stores before opt-in; after opt-in the tracking script stores attribution; rejecting keeps everything off
