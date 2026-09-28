# Keep preview deploys from being able to publish production

Status: ready-for-human
Source: security-audit skill run, 2026-09-28 (lead 1)

## Problem

Previews and production deploy with the same kind of Cloudflare token (Pages: Edit, account-wide), because a Pages token can't be limited to preview branches. The token is now only in the `preview` and `production` GitHub environments, not a repository secret. But anyone with write access to the repo could still push a branch whose workflow runs `wrangler pages deploy --branch=live` in the reviewer-free preview job. That would publish production for any Client without the `live` ruleset or the reviewer.

It's harmless while every repo writer is also the production reviewer.

## To decide (before the first collaborator with write access)

- Previews in a **separate Cloudflare account**, whose token can't touch production projects. Or:
- Previews deployed only from `main` by a workflow in the default branch (`workflow_run`), so a branch can't change the deploy script.
- Plus a GitHub ruleset that stops non-admins from changing `.github/workflows/`.

**M1**, or earlier if someone else gets write access.
