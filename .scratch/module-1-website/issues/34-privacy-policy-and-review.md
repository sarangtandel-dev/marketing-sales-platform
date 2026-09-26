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
