# 20: Repo scaffold, CI and secrets scan

**What to build:** The monorepo gets a workspace for the site build, the shared components and the form Worker. Every push runs CI with the (still empty) test suites for all three seams. Any commit containing a credential is blocked on pre-commit and again in CI, so the Brevo and Turnstile secrets can never enter git history (ADR-0016, issue 19 #2).

**Blocked by:** None (can start immediately)

Status: done

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] The workspace has separate packages for the site build, the components and the Worker, plus one command that runs every package's tests
- [x] CI runs on every push and pull request and passes with the empty suites
- [x] The secrets scan is chosen against the spec's criteria (works offline, maintained rules, allow-list), and the choice is written down
- [x] A commit containing a fake API key is rejected by the pre-commit hook and by CI
- [x] Turnstile's published test keys pass the scan
- [x] The README says how to install the hooks

## Comments

2026-09-27: built.

- **Choices:** pnpm workspaces, Vitest, gitleaks and plain git hooks. They're recorded in `docs/development.md`.
- **Tests:** the secrets-scan tests drive the real hook in a throwaway repo:
  - a Brevo key and a GitHub token are blocked
  - the Turnstile test keys and an ordinary commit pass
  - with the hook swapped for one that lets everything through, the "blocks" tests fail
- **Allow-list:** gitleaks' default rules don't flag the Turnstile test keys (they're low-entropy), so the allow-list is only a safeguard against future rule changes.
- **CI:** the first run on GitHub (36269982502, commit 39914d0) passed both jobs, Tests and Secrets scan, on 2026-09-27.
