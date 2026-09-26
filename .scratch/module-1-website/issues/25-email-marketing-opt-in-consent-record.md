# 25: Email marketing opt-in with consent record

**What to build:** Forms show an unticked email marketing checkbox. When a Lead ticks it, the Lead Log and Brevo both record the Marketing Opt-in with the exact wording version, a timestamp, the page URL and the form ID, so the agreement can be proven later (ADR-0021).

**Blocked by:** 24

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The site definition declares which opt-ins a form shows, and the wording text carries a version identifier
- [ ] The checkbox starts unticked, and submitting without ticking it records no opt-in
- [ ] A ticked opt-in is stored in the Lead Log with wording version, timestamp, page URL and form ID
- [ ] Brevo receives the opt-in and its wording version as contact attributes. Without an opt-in, the contact isn't added to a marketing list
- [ ] Seam 1 test: the checkbox renders unticked. Seam 2 tests: opt-in stored in the Lead Log and sent to Brevo; no opt-in when unticked
