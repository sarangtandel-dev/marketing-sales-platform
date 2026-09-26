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
| `tooling` | Tests for repo tooling, such as the secrets scan |
| `clients/<slug>/` | One Client's files (ADR-0024): `site/site-definition.json`, `design/theme.json` for the Theme, and `facts.yaml` (M0's single facts file). `pnpm test` validates every Client's facts file |

The tracking script (test seam 3) gets its home in ticket 27.

## Building a site

```bash
pnpm build:site clients/client-zero/site dist/client-zero
```

- The build validates the site definition and its Theme first. Any problem stops the build before anything is written, with the JSON path and the rule broken.
- Every site needs exactly one page of type `not-found`, which becomes `404.html`.
- The schemas are in `packages/site-builder/schema/`.
- Section components and their Section Variants are listed in `packages/components/src/catalog.ts`. A site definition can only use what's listed there.

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

## Tool choices

These were chosen at build time (ticket 20), against the criteria in the M0 spec.

- **pnpm workspaces:** one install and one lockfile for all packages. Shared code is linked, not published (ADR-0003).
- **Vitest:** one runner for every seam, with one project per package. It's Vite-based like Astro, and it has a Cloudflare Workers pool for the form Worker.
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
