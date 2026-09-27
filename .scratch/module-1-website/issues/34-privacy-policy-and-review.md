# 34: Privacy policy page and qualified review

**What to build:** The site gets a hand-written privacy policy that describes what the site really does: every processor (Cloudflare, Brevo, the consent tool, Google), the data collected, 90-day Lead Log retention, Marketing Opt-ins, Consent and how to request access or deletion. A qualified person reviews it before launch (ADR-0014 M0, issue 19 #6).

**Blocked by:** 25, 28

Status: ready-for-human

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The policy names every processor actually used and what each processes
- [ ] It states the Lead Log's 90-day retention, where Leads are stored, and that Brevo is the lasting record
- [ ] It covers India's DPDP Act and GDPR for EU Visitors
- [ ] A qualified person has reviewed it, and the reviewer and date are recorded
- [ ] The page is in the site definition and linked next to every form's submit button

2026-09-27, draft by the agent (the review needs a qualified person):

- **The draft:** the privacy page in Client #0's site definition is a full draft, written from what the build actually does:
  - the form fields, the page URL without tracking codes, and the Consent state
  - the purposes and legal bases under DPDP and GDPR
  - every processor: Cloudflare, Brevo, CookieYes and Google
  - the 90-day Lead Log retention
  - consent-gated browser storage and click IDs
  - transfers, rights under both laws, a grievance officer, children, and changes
- **Your part:**
  - Fill in the `[TO FILL]` items: legal name, address, contact, Brevo retention, CookieYes record retention, response time, the grievance officer, and the date.
  - Have a qualified person review the whole text.
  - Remove the "Draft status" block, and record the reviewer and date here.
- **Safety net:** the launch check fails while any `TO FILL` remains.
