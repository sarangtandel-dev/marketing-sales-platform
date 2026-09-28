# Release each Client on its own tag, not one shared live branch

Status: ready-for-agent
Source: audit C18 (×2), ADR-0035, 2026-09-28

## Problem

Every Client deploys to production from the one `live` branch, so releasing one Client releases all of them, and one Client's failed launch check blocks everyone's release.

## Task

Deploy a Client to production when a tag `<slug>/vX.Y.Z` is pushed (ADR-0035 versioning). The Deploy workflow builds and deploys only that Client, runs its launch check, and uses the `production` environment. Branch pushes stay previews. Document it in `docs/development.md` and `onboard-client.md`.

**M1**.
