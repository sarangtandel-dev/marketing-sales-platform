# Development

How to work on the Module 1 code. The design lives in `CONTEXT.md` and `docs/adr/`. The M0 scope and test seams are in `.scratch/module-1-website/spec.md`.

## Setup

1. Install Node 22 or later and gitleaks (macOS: `brew install gitleaks`). pnpm comes through Corepack at the version in `package.json` (`corepack enable`).
2. Run `pnpm install`. It also points git at `.githooks/`, so the pre-commit secrets scan is active.
3. Run `pnpm test` to run every package's tests.

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the form Worker and a preview build of Client #0 locally (`pnpm dev clients/<slug>` for another Client). The site is on http://localhost:8788, served by `wrangler pages dev` so `_headers` and `_redirects` apply; the Worker is on :8787 with Turnstile's test secret and no Brevo key |
| `pnpm test` | Every package's tests |
| `pnpm typecheck` | TypeScript: the Worker on Workers types, everything else on DOM and Node types |
| `pnpm knip` | Unused files, dependencies and exports. CI fails on any |
| `pnpm check:launch clients/<slug>` | The automated launch checks (below) |
| `pnpm forms:manifest` | Regenerates the forms manifest the Worker accepts, after any change to Client #0's forms |

**Supply chain:**
- pnpm won't install a version published less than a day ago (`minimumReleaseAge`), or a dependency from a git repo or URL.
- Only esbuild and workerd may run install scripts (`pnpm-workspace.yaml`).

## Layout

| Path | What it is |
|---|---|
| `packages/site-builder` | Builds a Client's static site from its site definition and Theme. Test seam 1 |
| `packages/components` | Shared section components with Section Variants, styled only by Theme tokens |
| `packages/knowledge-base` | Facts: the schema and validator for a Client's facts file (ADR-0007, ADR-0024) |
| `packages/form-worker` | The Cloudflare Worker for form submissions. Test seam 2 |
| `packages/tracking` | The tracking script: consent-gated attribution with no personal data, and the only source of tracking events. Test seam 3 |
| `tooling` | Repo tooling and its tests: the launch check, the internal link check, `pnpm dev`, the secrets scan tests |
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
- **One form per page.** A field can't use a name the form or the Worker would drop: `website`, `page_url`, `lead_id`, `form_id`, `form_type`, `lead_received_at`, `opt_in_*` or `email_opt_in*`.
- **Every build writes `_headers` and, when the site definition has `redirects`, `_redirects`.** Every response gets:
  - a header-only CSP: no framing, no `<base>`, no plugins
  - `nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - a Permissions-Policy
  - HSTS

  There's no script or style CSP yet: CookieYes and GTM inject both, so it needs a browser check first (issue 42).
- **Files in `clients/<slug>/site/public/`** are copied as they are. A `favicon.svg` or `favicon.ico` there is linked from every page.
- **With a consent tool,** the footer needs `cookie_settings`: the label of the button that reopens the banner.
- **axe-core's WCAG A/AA rules** run on every page of the fixture and the showcase. jsdom has no layout, so colour contrast is checked by hand.

## Running the form Worker locally

`pnpm dev` does all of this. By hand:

```bash
cd packages/form-worker
pnpm exec wrangler d1 migrations apply LEAD_LOG --local
pnpm exec wrangler dev --port 8787 \
  --var ALLOWED_ORIGINS:http://localhost:8788 \
  --var TURNSTILE_SECRET_KEY:1x0000000000000000000000000000000AA \
  --var TURNSTILE_SKIP_HOSTNAME:true
```

Then build a preview that posts to it:

```bash
pnpm build:site clients/client-zero/site dist/client-zero --preview --form-endpoint http://localhost:8787/lead
```

- A `--preview` build always uses Turnstile's test site key (ADR-0028).
- `--form-endpoint` replaces each form's production endpoint.
- To look at the stored Leads: `pnpm exec wrangler d1 execute LEAD_LOG --local --command "SELECT * FROM leads"`.

**What the Worker accepts:**
- Only the forms in its **forms manifest** (`src/forms.generated.json`, generated from the site definition by `pnpm forms:manifest`; a test fails if it's stale).
- An unknown form, or a form type that doesn't match, is rejected.
- Unknown fields and opt-in wording versions the site never showed are dropped.
- Each IP may send 20 submissions a minute (10 on the preview Worker).
- Turnstile tokens must have been solved on one of `ALLOWED_ORIGINS`' hosts.

## Brevo setup (per Client, done by a person)

The Worker delivers each Lead to Brevo keyed by email:
- **A new email** becomes a contact with the Lead's fields.
- **An email that already has a contact** only gets the Lead's own details updated (`LEAD_ID`, `FORM_ID`, `FORM_TYPE`, `LEAD_RECEIVED_AT`, `PAGE_URL`), never its name or company. Anyone can type any email into a form, so a submission must not overwrite someone's record.

Before the first real Lead:

- **Create these contact attributes in Brevo (type text):**
  - `LEAD_ID`, `FORM_ID`, `FORM_TYPE`, `PAGE_URL` and `LEAD_RECEIVED_AT`
  - one attribute per form field other than `email`, named after the field in capitals (`name` → `NAME`, `company_size` → `COMPANY_SIZE`)
- **For email Marketing Opt-ins:**
  1. Create `EMAIL_OPT_IN` (boolean), and `EMAIL_OPT_IN_VERSION`, `EMAIL_OPT_IN_AT`, `EMAIL_OPT_IN_PAGE` and `EMAIL_OPT_IN_FORM` (text).
  2. Create the marketing list and a **double opt-in** template.
  3. Set the Worker vars `BREVO_MARKETING_LIST_ID`, `BREVO_DOI_TEMPLATE_ID` and `BREVO_DOI_REDIRECT_URL` (a thank-you page on the site).

  Brevo then emails a confirmation link, and the contact joins the list only after clicking it. Until all three are set, opt-ins stay in the Lead Log only, and the delivery log says so.
- **Set the Worker secret:** `pnpm exec wrangler secret put BREVO_API_KEY --env=""`.
- **What happens on a failure:**
  - If Brevo rejects a Lead (for example, because an attribute is missing), the Worker gives up at once and alerts the owner with the Lead to add by hand.
  - Temporary failures are retried for about 14.5 hours.
  - An alert that fails to send is retried by the cron, up to 5 times.
  - Failures found in one cron run arrive as a single digest email.
- **Known limitation, double opt-in:** anyone can type a stranger's email and tick the opt-in, which sends that person one confirmation email from the Client. They're only subscribed if they click it. The per-IP rate limit and Turnstile bound this.
- **Known limitation (M0):** a second enquiry from the same email updates only the Lead details on the existing contact. Its message and other fields are in the Lead Log (90 days) and the owner's alert, not in Brevo. Keeping one Brevo record per Lead (an event, note or deal keyed by lead ID) belongs with Module 2's CRM work (ADR-0036).

## Monitoring (ADR-0037)

**The daily check** runs on the Worker's daily cron (`17 3 * * *`) and emails "Daily check failed" with every problem it finds:
1. **A signed test Lead** goes through the real endpoint handler from the site's own origin, so a wrong `ALLOWED_ORIGINS` is caught. It must reach the Lead Log and be delivered to Brevo, and is then deleted from both. Workers with no Brevo key (the preview) skip this part.
2. **The Turnstile secret** is checked with siteverify.
3. **Leads from the last 3 days whose alerts ran out of attempts** are listed by id.
4. **25 or more Turnstile rejections the day before** are reported (a broken widget refuses real Visitors).

Test Leads never trigger the owner's new-lead alert.

**Heartbeat:**
- After each daily check, the Worker pings `HEARTBEAT_URL` (healthchecks.io), or its `/fail` URL when there were problems.
- healthchecks.io alerts when the ping stops, so silence (crons stopped, alerts broken) is noticed too.
- Set the check's period to 1 day and its grace to 3 hours.

**Push alerts:**
- Every alert's subject line is also pushed to `NTFY_URL` (an ntfy topic on the owner's phone), so one broken Email Routing binding can't silence everything.
- Subjects never contain a Lead's details.

**Before launch, by hand,** run the test Lead against the preview:
```bash
MONITOR_SECRET=... MONITOR_TEST_EMAIL=... node packages/form-worker/scripts/send-test-lead.ts https://<worker>/lead
```
The script prints the command that removes the test Lead afterwards.

**Locally:**
1. `wrangler dev --test-scheduled --var MONITOR_SECRET:...`
2. `curl "http://localhost:8787/__scheduled?cron=17+3+*+*+*"`
3. Alerts are written under `.wrangler/tmp/email/`.

**Uptime (set up by a person):** any free external uptime monitor. Have it check the site's home page and the Worker's `/health` (GET or HEAD; it checks D1) every 5 minutes.

**Logs:** Workers Logs and traces are on (`observability` in `wrangler.jsonc`). See [incident.md](procedures/incident.md).

## Launch check

```bash
pnpm check:launch clients/client-zero
```

**Fails** (exit 1) on any of these:
- the site definition or facts file:
  - an invalid site definition or facts file, or one that can't be read
  - a `TO FILL` placeholder anywhere in the site definition, Theme or facts file
  - an `unverified` or `rejected` Fact
  - a pages.dev `site_url`
- the forms:
  - a Turnstile test key in production
  - a placeholder form endpoint
  - an endpoint off the Client's domain
- the Worker config (`packages/form-worker/wrangler.jsonc`, or `--worker <file>`):
  - the placeholder D1 `database_id`
  - example alert or monitoring addresses
  - another Client's `CLIENT_SLUG`
  - an `ALLOWED_ORIGINS` without the site
- a missing GTM, GA4 or consent tool setting

**Always lists** the launch checks only a person can do: claims against Facts, alt text and rights, contrast, the privacy review, the end-to-end test Lead, Email Routing, GTM and GA4, CookieYes, Brevo attributes and double opt-in, the preview Worker, DNS, the Worker secrets, Search Console and monitoring.

## Procedures

- [Release the form Worker](procedures/release-worker.md): first release, later releases, rollback, DNS and Email Routing, the preview Worker.
- [Onboard a Client](procedures/onboard-client.md): from intake to launch.
- [Incident](procedures/incident.md): Leads not arriving, or an alert fired.
- [Restore the Lead Log](procedures/restore-lead-log.md): D1 Time Travel.
- [Rotate secrets](procedures/rotate-secrets.md).
- [Personal data breach](procedures/breach.md).
- [Lead data requests](procedures/lead-data-requests.md): export or delete one person's data.
- [Accounts register](procedures/accounts.md): who owns and administers each outside account.

## Deploying

The `Deploy` workflow runs on every push, in two jobs:

1. **build** (no Cloudflare token):
   - installs the workspace and builds every Client
   - one Client's broken build doesn't stop the others
   - on `live`, it first runs `pnpm test` and every Client's `pnpm check:launch`
2. **deploy** (holds the token):
   - installs only wrangler
   - uploads each Client with `wrangler pages deploy` to the Pages project named after its slug
   - runs under harden-runner, which records every outbound connection
   - on `live`, it runs in the `production` GitHub environment

The deploy job fails at the end if any Client wasn't deployed.

Every branch, `main` included, deploys as a **preview**. Previews are noindex, and a newer push cancels a preview still in progress. The projects' production branch is `live`; a `live` deploy is never cancelled.

**One-time setup, done by a person:**

1. In Cloudflare, create an API token with the **Cloudflare Pages: Edit** permission only, scoped to our account.
2. Create two GitHub environments, `preview` and `production`:
   - `production` is restricted to the `live` branch and has a required reviewer
   - give each the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (from the Cloudflare dashboard)
   - never add them as repository secrets: only the deploy job, inside an environment, can read them
   - then set the repository variable `DEPLOY_ENABLED` to `true`
3. Create each Client's Pages project once, with `live` as its production branch:
   ```bash
   pnpm exec wrangler pages project create client-zero --production-branch live
   ```
4. In the GitHub repo settings:
   - add a branch ruleset on `live` (pull requests only, CI must pass)
   - turn on CodeQL default setup, secret scanning with push protection, and "require actions to be pinned to a full-length commit SHA"

Until `DEPLOY_ENABLED` is `true`, the workflow deploys nothing and says so in the run.

- **Branches only:** the workflow only runs for branches. A tag named `live` never takes the production path.
- **The artifact decides nothing:** the deploy job takes the list of Clients from its own checkout. It stops on anything else in the build artifact, or on any `_worker.js` or `functions/` (the sites are static).
- **Known limit (issue 50):** a Pages token can't be limited to preview branches, so anyone who can push to the repo could publish production through a preview run. That's fine while every writer is also the production reviewer.

**Previews never touch production (ADR-0028):**
- Every branch except `live` builds with `--preview`, so its forms use Turnstile's test key.
- Preview forms post to the **preview form Worker**, set in the repository variable `PREVIEW_FORM_ENDPOINT`. See [release-worker.md](procedures/release-worker.md#the-preview-worker).
- **The preview Worker has no Brevo key:** QA Leads are stored and alerted, never delivered.
- **Its alerts are marked:** they start with `[PREVIEW]` and go to a QA inbox, never the owner's, and it has no ntfy topic. Anyone can post to it, because it only has Turnstile's test secret.
- **It's rate limited,** and it skips the Turnstile hostname check, because Turnstile's test secret reports example.com.
- If the variable isn't set, preview forms post to an address that doesn't exist, never to production.

**CI** (every push and pull request): tests, the secrets scan, the type-check, knip, a preview build of every Client with its internal links checked, and zizmor on the workflows.

**Workflow security:**
- Every action is pinned to a commit SHA, and the local action uses GitHub's `$/` self-repository syntax.
- Workflows can only read the repo.
- Dependabot proposes grouped weekly updates, at least 7 days after release.

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
- **Added in the 2026-09-28 audit (each fixes a finding):**
  - **pnpm 12,** for its supply-chain settings.
  - **TypeScript 7** for the type-check.
  - **knip** for unused code.
  - **axe-core** for accessibility rules.
  - **zizmor** and **harden-runner** for the workflows.
  - **Dependabot.**
  - **Link checking is ours,** in `tooling/check-links.ts`. lychee can't take one root directory per Client in one run.
  - **Native platform features where they cover it:** the Workers rate-limit binding, Workers Logs, D1 Time Travel, Pages `_headers`/`_redirects`, healthchecks.io and ntfy through one `fetch` each.

## Agent tools

Installed for Claude Code on the agency machine (not in the repo). They help agents write correct code and review the sites:

| Tool | Use it for |
|---|---|
| `cloudflare` skills: `workers-best-practices`, `wrangler`, `web-perf` | Worker code and config, wrangler commands, performance audits |
| `web-quality-skills`: `accessibility`, `best-practices`, `core-web-vitals`, `performance`, `seo`, `web-quality-audit` | A quality audit of a built site before launch |
| `marketingskills`: `copywriting`, `schema`, `seo-audit`, `cro`, `site-architecture` | Copy and JSON-LD for a Client's site (ticket 33); claims still need Facts |
| `chrome-devtools-mcp` (usage statistics off) | Checking in a real browser that nothing loads before consent, and that the console is clean |
| `ponytail` | The code style in `CLAUDE.md` |
| `archify` | The diagrams in `docs/diagrams/` |
| `security-audit` (cloudflare/security-audit-skill) | A full source audit before launch (run once on 2026-09-28); triage its findings into `.scratch/` |

## Secrets scan

- **Pre-commit:** scans the staged changes. It fails if gitleaks isn't installed, so the check can't be skipped by accident.
- **CI:** scans the full git history on every push and pull request.
- **Allowed:** Cloudflare Turnstile's published test keys, which previews use (ADR-0028). Everything else that looks like a credential is blocked.
- **Scan the history by hand:** `pnpm secrets:scan`.
- **False positive:** add a narrow entry to `.gitleaks.toml`. Never use `--no-verify`.
