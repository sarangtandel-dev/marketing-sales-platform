# 25: Email marketing opt-in with consent record

**What to build:** Forms show an unticked email marketing checkbox. When a Lead ticks it, the Lead Log and Brevo both record the Marketing Opt-in with the exact wording version, a timestamp, the page URL and the form ID, so the agreement can be proven later (ADR-0021).

**Blocked by:** 24

Status: done

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] The site definition declares which opt-ins a form shows, and the wording text carries a version identifier
- [x] The checkbox starts unticked, and submitting without ticking it records no opt-in
- [x] A ticked opt-in is stored in the Lead Log with wording version, timestamp, page URL and form ID
- [x] Brevo receives the opt-in and its wording version as contact attributes. Without an opt-in, the contact isn't added to a marketing list
- [x] Seam 1 test: the checkbox renders unticked. Seam 2 tests: opt-in stored in the Lead Log and sent to Brevo; no opt-in when unticked

## Comments

2026-09-27: built and checked in a browser against wrangler dev.

- **Site definition:** `forms[].opt_ins` holds `{ channel: "email", version, label }`. M0's schema allows only `email`; SMS and WhatsApp are DESIGNED ONLY.
- **Form:** the checkbox is rendered unticked. The browser sends only ticked opt-ins, as `{ channel, version }`, and they're kept out of the form fields.
- **Worker:** accepts at most one opt-in per channel. It stores `{ channel, wording_version, given_at, page_url, form_id }` in `leads.opt_ins`, with `given_at` equal to the Lead Log `created_at`.
- **Brevo:** gets `EMAIL_OPT_IN` plus the version, time, page and form. The contact joins `BREVO_MARKETING_LIST_ID` only when the Lead opted in.
- **Wording text:** stays in the site definition's git history; the stored version points at it.
- **Tests:** seam 1 has a checkbox test and a validation test; seam 2 has 4 opt-in tests.
- **Browser check:** the box started unticked, and the record landed in the Lead Log with every field.
