# Development

How to work on the Module 1 code. The design lives in `CONTEXT.md` and `docs/adr/`. The M0 scope and test seams are in `.scratch/module-1-website/spec.md`.

## Setup

1. Install Node 22 or later, pnpm 10 and gitleaks (macOS: `brew install pnpm gitleaks`).
2. Run `pnpm install`. It also points git at `.githooks/`, so the pre-commit secrets scan is active.
3. Run `pnpm test` to run every package's tests.

## Layout

| Path | What it is |
|---|---|
| `packages/site-builder` | Builds a Client's static site from its site definition and Theme. Test seam 1 |
| `packages/components` | Shared section components with Section Variants, styled only by Theme tokens |
| `packages/knowledge-base` | Facts: the schema and validator for a Client's facts file (ADR-0007, ADR-0024) |
| `packages/form-worker` | The Cloudflare Worker for form submissions. Test seam 2 |
| `packages/tracking` | The tracking script: consent-gated attribution with no personal data, and the only source of tracking events. Test seam 3 |
| `tooling` | Tests for repo tooling, such as the secrets scan |
| `clients/<slug>/` | One Client's files (ADR-0024): `site/site-definition.json`, `design/theme.json` for the Theme, and `facts.yaml` (M0's single facts file). `pnpm test` validates every Client's facts file |

## Building a site

```bash
pnpm build:site clients/client-zero/site dist/client-zero
```

- The build validates the site definition and its Theme first. Any problem stops the build before anything is written, with the JSON path and the rule broken.
- Every site needs exactly one page of type `not-found`, which becomes `404.html`.
- The schemas are in `packages/site-builder/schema/`.
- Section components are listed in `packages/components/src/catalog.ts`, with their Section Variants, their text keys and item keys, and whether they take CTAs or a form. A site definition can only use what's listed there. The components are `hero`, `services`, `steps`, `testimonials`, `faq`, `text`, `cta-band` and `contact-form`.
- To see every component in every variant, build the showcase: `pnpm build:site packages/site-builder/test/fixtures/showcase dist/showcase`.
- A page's first section gets its `h1`.
- When a site has forms, every page must offer a way to one: a form on the page, or a CTA to a page with one (ADR-0023).
- Components use Theme tokens only. A test fails on hard-coded colours, Tailwind palette colours or font families.

## Running the form Worker locally

```bash
cd packages/form-worker
pnpm exec wrangler d1 migrations apply LEAD_LOG --local
pnpm exec wrangler dev --port 8787 \
  --var ALLOWED_ORIGINS:http://127.0.0.1:4321 \
  --var TURNSTILE_SECRET_KEY:1x0000000000000000000000000000000AA
```

Then build a preview that posts to it, and serve it on port 4321:

```bash
pnpm build:site clients/client-zero/site dist/client-zero --preview --form-endpoint http://localhost:8787/lead
```

- A `--preview` build always uses Turnstile's test site key (ADR-0028).
- `--form-endpoint` replaces each form's production endpoint.
- To look at the stored Leads: `pnpm exec wrangler d1 execute LEAD_LOG --local --command "SELECT * FROM leads"`.

## Brevo setup (per Client, done by a person)

The Worker upserts each Lead as a Brevo contact, keyed by email. Before the first real Lead:

- **Create these contact attributes in Brevo (type text):**
  - `LEAD_ID`, `FORM_ID`, `FORM_TYPE`, `PAGE_URL` and `LEAD_RECEIVED_AT`
  - one attribute per form field other than `email`, named after the field in capitals (`name` → `NAME`, `company_size` → `COMPANY_SIZE`)
- **For email Marketing Opt-ins, also create:** `EMAIL_OPT_IN` (boolean), and `EMAIL_OPT_IN_VERSION`, `EMAIL_OPT_IN_AT`, `EMAIL_OPT_IN_PAGE` and `EMAIL_OPT_IN_FORM` (text). Then create the marketing list and set its ID as the Worker var `BREVO_MARKETING_LIST_ID`. Only contacts who ticked the opt-in join it.
- **Set the Worker secret:** `pnpm exec wrangler secret put BREVO_API_KEY`.
- **What happens on a failure:** if Brevo rejects a Lead (for example, because an attribute is missing), the Worker gives up at once and emails the owner the Lead to add by hand. Temporary failures are retried for about 14.5 hours. An alert that fails to send is retried by the cron, up to 5 times.
- **Known limitation (M0):** Leads are upserted onto one contact per email address. A second enquiry from the same address overwrites the first one's `LEAD_ID`, `MESSAGE` and form attributes in Brevo, and once the Lead Log's 90 days pass, the first enquiry's details exist only in the owner's alert email. Keeping one Brevo record per Lead (an event, note or deal keyed by lead ID) belongs with Module 2's CRM work (ADR-0036).

## Monitoring (ADR-0037)

- **Daily test Lead:** the Worker's daily cron (`17 3 * * *`) does four things:
  1. Sends a test Lead through its real endpoint handler, signed with `MONITOR_SECRET` instead of a Turnstile token.
  2. Checks the Lead reached the Lead Log and was delivered to Brevo.
  3. Emails "Daily test Lead failed" through the alert binding if either step failed.
  4. Deletes the test contact from Brevo and the test row from the Lead Log.

  Test Leads never trigger the owner's new-lead alert.
- **Before launch, by hand:** run the same check against the preview.
  ```bash
  MONITOR_SECRET=... MONITOR_TEST_EMAIL=... node packages/form-worker/scripts/send-test-lead.ts https://<worker>/lead
  ```
  The script prints the command that removes the test Lead afterwards.
- **Locally:**
  1. Start the Worker with scheduled testing on: `wrangler dev --test-scheduled --var MONITOR_SECRET:...`
  2. Trigger the daily cron: `curl "http://localhost:8787/__scheduled?cron=17+3+*+*+*"`
  3. Alerts are written under `.wrangler/tmp/email/`.
- **Uptime (set up by a person):** use any free external uptime monitor. Have it check the site's home page and the Worker's `GET /health` every 5 minutes, and alert by email. `/health` writes nothing.
- **Secrets and vars:** `wrangler secret put MONITOR_SECRET`, plus the `MONITOR_TEST_EMAIL` var: an address we own, which is cleaned out of Brevo after every check.

## Procedures

- [Lead data requests](procedures/lead-data-requests.md): export or delete one Lead's data on request.

## Deploying

The `Deploy` workflow runs on every push:
- It builds each Client whose files changed. A change to `packages/` or the lockfile rebuilds every Client.
- It uploads each one with `wrangler pages deploy` to a Pages project named after the Client's slug.
- Every branch, `main` included, deploys as a **preview**. Previews are noindex. The projects' production branch is `live`, and only the launch (ticket 36) deploys to it.

**One-time setup, done by a person:**

1. In Cloudflare, create an API token with the **Cloudflare Pages: Edit** permission only, scoped to our account.
2. Add two GitHub repository secrets: `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID` (from the Cloudflare dashboard).
3. Create each Client's Pages project once, with `live` as its production branch:
   ```bash
   pnpm exec wrangler pages project create client-zero --production-branch live
   ```

Until the secrets exist, the workflow deploys nothing and says so in the run.

**Previews never touch production (ADR-0028):**
- Every branch except `live` builds with `--preview`, so its forms use Turnstile's test key.
- Preview forms post to the **preview form Worker**, set in the repository variable `PREVIEW_FORM_ENDPOINT`. That Worker is the `preview` environment in `packages/form-worker/wrangler.jsonc`, with its own Lead Log.
- Deploy it with `wrangler deploy --env preview`.
- Set its `TURNSTILE_SECRET_KEY` to Turnstile's test secret (`1x0000000000000000000000000000000AA`).
- Its `ALLOWED_ORIGINS` accepts every branch preview through `https://*.<project>.pages.dev`.
- If the variable isn't set, preview forms post to an address that doesn't exist, never to production.

## Tool choices

These were chosen at build time (ticket 20), against the criteria in the M0 spec.

- **pnpm workspaces:** one install and one lockfile for all packages. Shared code is linked, not published (ADR-0003).
- **Vitest:** one runner for every seam, with one project per package. It's Vite-based like Astro.
- **Miniflare 4 (stable, pinned)** for the form Worker's tests (ticket 22):
  - the tests bundle the real Worker with esbuild and run it in Cloudflare's local runtime, with a local D1 Lead Log
  - outside services (Turnstile, Brevo) are faked at their HTTP boundary
  - Cloudflare's Vitest Workers pool isn't used, because it doesn't support Vitest 5 yet
  - Miniflare 5, which wrangler bundles, is still an alpha
  - the Worker's `compatibility_date` must be one the pinned Miniflare runtime supports
- **gitleaks** for the secrets scan (issue 19 #2):
  - it runs offline in the pre-commit hook
  - it has a maintained default ruleset, including a Brevo key rule
  - `.gitleaks.toml` has an allow-list
  - CI pins the version and verifies the release checksum.
- **Plain git hooks:** `core.hooksPath` points at `.githooks/`, so no hook-manager dependency is needed.

## Secrets scan

- **Pre-commit:** scans the staged changes. It fails if gitleaks isn't installed, so the check can't be skipped by accident.
- **CI:** scans the full git history on every push and pull request.
- **Allowed:** Cloudflare Turnstile's published test keys, which previews use (ADR-0028). Everything else that looks like a credential is blocked.
- **Scan the history by hand:** `pnpm secrets:scan`.
- **False positive:** add a narrow entry to `.gitleaks.toml`. Never use `--no-verify`.
