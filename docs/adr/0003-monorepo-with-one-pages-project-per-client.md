---
status: accepted
---

# Monorepo, one Cloudflare Pages project per Client

All Client sites, the shared component library and the Category Packs live in one repository. Each Client gets its own Cloudflare Pages project. A single repository means a fix to a component or pack reaches every Client. Separate Pages projects keep deploys, custom domains, and rollbacks separate for each Client.

## Consequences

Cloudflare Pages limits (checked 2026-09-17, `developers.cloudflare.com/pages/platform/limits/`):

- **100 Pages projects per account.** One project per Client therefore caps us at about **100 Clients per Cloudflare account**. That's roughly the same ceiling as Turnstile (ADR-0028).
- **Builds:** Free 500/month with 1 concurrent; Pro 5,000/month with 5; Business 20,000/month with 20. Each build times out after 20 minutes.
- **Custom domains per project:** Free 100, Pro 250, Business 500.
- **Files:** 20,000 per site on Free and 100,000 on paid plans. Each file can be up to 25 MiB.

**Capacity:** the Pages project limit and the Turnstile limit (ADR-0028) together give about **100 Clients per Cloudflare account**. We review how to scale **at 70 Clients**: ask Cloudflare to raise the limit, or split Clients across accounts (issue 15).

## Milestone

M0. Scaling past 100 Clients per account: DESIGNED. See ADR-0039.
