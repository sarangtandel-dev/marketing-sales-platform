---
status: accepted
---

# Turnstile widgets are shared across Clients, up to 10 hostnames each

**The limit:** Turnstile's free tier allows 20 widgets with 10 hostnames each (checked 2026-09-17).

**How we use it:**

- Clients are grouped onto shared widgets, up to 10 production hostnames per widget.
- `pages.dev` hostnames are never used in production.
- Staging and preview environments use **Turnstile test keys**, never production widgets.

**Capacity:** this gives room for about 100 Clients, which matches the limit of 100 Pages projects per account (ADR-0003). Together these give about **100 Clients per Cloudflare account**. We review the plan **at 70 Clients** (issue 15).

**Trade-off:** Clients sharing a widget also share its analytics.

## Milestone

M0 See ADR-0039.
