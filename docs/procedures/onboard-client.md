# Onboard a Client

The steps from signed Client to live site, as run for Client #0. Most steps are done by a person (ADR-0038). Tick each one in the Client's onboarding ticket.

M0 has one form Worker, for Client #0. A second Client needs the M1 decision on one Worker per Client first (see the Batch 5 ticket). Until then, stop at step 5 and build a preview only.

## 1. Intake and Facts (ADR-0005, ADR-0007)

- Run the intake with the Client, then create `clients/<slug>/facts.yaml`.
- Each claim on the site needs a Fact, with its source and status.
- `pnpm test` validates the file.

## 2. Design (ADR-0006, ADR-0019)

- Produce the Theme from Claude Design, as `clients/<slug>/design/theme.json`.
- Check its colour pairs for WCAG AA contrast.

## 3. Site definition (ADR-0034)

- Write `clients/<slug>/site/site-definition.json`.
- Its pages, CTAs and forms use only catalogued components.
- Include the footer's `cookie_settings` label.
- Put the favicon in `clients/<slug>/site/public/`.
- Then check it:
  ```bash
  pnpm build:site clients/<slug>/site dist/<slug> --preview --form-endpoint https://forms.invalid/lead
  node tooling/check-links.ts dist/<slug>
  ```

## 4. Accounts (owned by the Client where possible, ADR-0011)

Record each in [accounts.md](accounts.md):

- **Cloudflare:** Pages project `<slug>` with production branch `live` (`pnpm exec wrangler pages project create <slug> --production-branch live`), and a Turnstile widget grouped as ADR-0028 says.
- **Google:** a GTM container (import `packages/tracking/gtm/container.json`, then set the GA4 measurement ID variable), GA4 with `generate_lead` as a key event, and Search Console.
- **CookieYes:** set up the banner and Consent Mode. Its id goes in the site definition.
- **Brevo:** the Client's own account:
  - the contact attributes and the marketing list (`docs/development.md`)
  - a double opt-in template with a confirmation page on the site
  - an API key

## 5. Preview and review

- Every push deploys a preview. Review it with the Client.
- Run a test Lead through the preview Worker (`scripts/send-test-lead.ts`), and check the consent banner and events.

## 6. Launch (ticket 36 for Client #0)

1. **DNS, Email Routing and the production Worker:** [release-worker.md](release-worker.md).
2. **Fill every placeholder** until `pnpm check:launch clients/<slug>` passes, then work through its manual list.
3. **Get the privacy policy reviewed** by a qualified person, and record the reviewer and date.
4. **Merge to `live`.** The Deploy workflow runs the tests and the launch check, and waits for the `production` environment's reviewer.
5. **After launch:**
   - submit the sitemap in Search Console
   - confirm the uptime monitor and the heartbeat
   - check the next day's daily check passed
