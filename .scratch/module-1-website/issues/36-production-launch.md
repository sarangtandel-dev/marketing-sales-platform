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

2026-09-28, audit (Phase 1): the launch now also needs, from a person:
- the production Worker set up by `docs/procedures/release-worker.md`, including DNS and Email Routing (use a subdomain if the domain's email runs elsewhere)
- Worker secrets `HEARTBEAT_URL` (a healthchecks.io check, period 1 day, grace 3 hours) and `NTFY_URL` (a random ntfy topic the owner subscribes to)
- the Brevo double opt-in template and thank-you page (`BREVO_DOI_TEMPLATE_ID`, `BREVO_DOI_REDIRECT_URL`)
- GitHub settings: a `production` environment with a required reviewer, a ruleset on `live`, CodeQL default setup, secret scanning push protection, and "require actions pinned to a full-length commit SHA"
- the accounts register filled in (`docs/procedures/accounts.md`)
- `pnpm check:launch clients/client-zero` passing, which now also checks the Worker config
- after the security-audit fixes: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` go in the `preview` and `production` environments (production restricted to `live`), never as repository secrets, then set the variable `DEPLOY_ENABLED=true`; the preview Worker's alerts go to a QA inbox (`ALERT_TO`, `send_email`), not the owner's
