# 36: Production launch of Client #0

**What to build:** The agency site goes live on our domain and captures real Leads. The Cloudflare account is hardened, production keys are set, the launch checklist is complete, and monitoring is running (ADR-0012, ADR-0037 launch, ADR-0039).

**Blocked by:** 33, 34, 35, and issue 18

Status: ready-for-human

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The Cloudflare account has 2FA for every member, least-privilege roles, scoped API tokens, and audit logs on (ADR-0012)
- [ ] The production Pages project serves our domain over standard DNS, on the apex and `www`, with TLS
- [ ] The production Turnstile widget covers only production hostnames, and the owner alert address is verified in Email Routing
- [ ] If issue 18 found indexed URLs, a hand-written `_redirects` file sends each to its best matching new page with a 301
- [ ] Every item on the spec's launch checklist is ticked: claims checked against the facts file, alt text, rights and contrast, privacy policy reviewed, end-to-end test Lead on preview
- [ ] The sitemap is submitted to Search Console, and the uptime monitor and daily test Lead are running against production
- [ ] The first real test Lead in production reaches the Lead Log, Brevo and the owner's inbox

2026-09-27, from the independent review, to check at launch:

- Confirm the deployed `send_email` binding accepts the structured `send({ from, to, subject, text })` form. The classic Email Routing binding takes `new EmailMessage(from, to, rawMime)`. wrangler dev and Cloudflare's current docs accept the structured form, but the tests use a fake binding. If alerts show `alert_status = 'failed'`, switch to a raw MIME message.
- Deploy the preview form Worker (`wrangler deploy --env preview`), and set the `PREVIEW_FORM_ENDPOINT` repository variable.

2026-09-27: `pnpm check:launch clients/client-zero` runs the automated half of the launch checklist and prints the manual half. See `docs/development.md` ("Launch check").
