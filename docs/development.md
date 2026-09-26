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
| `packages/form-worker` | The Cloudflare Worker for form submissions. Test seam 2 |
| `tooling` | Tests for repo tooling, such as the secrets scan |

The tracking script (test seam 3) gets its home in ticket 27.

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
