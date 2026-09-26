# 20: Repo scaffold, CI and secrets scan

**What to build:** The monorepo gets a workspace for the site build, the shared components and the form Worker. Every push runs CI with the (still empty) test suites for all three seams. Any commit containing a credential is blocked on pre-commit and again in CI, so the Brevo and Turnstile secrets can never enter git history (ADR-0016, issue 19 #2).

**Blocked by:** None (can start immediately)

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The workspace has separate packages for the site build, the components and the Worker, plus one command that runs every package's tests
- [ ] CI runs on every push and pull request and passes with the empty suites
- [ ] The secrets scan is chosen against the spec's criteria (works offline, maintained rules, allow-list), and the choice is written down
- [ ] A commit containing a fake API key is rejected by the pre-commit hook and by CI
- [ ] Turnstile's published test keys pass the scan
- [ ] The README says how to install the hooks
