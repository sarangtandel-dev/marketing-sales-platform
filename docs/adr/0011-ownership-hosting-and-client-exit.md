---
status: accepted
---

# Clients own their accounts and lead data; we own hosting and code; exit is a documented handover

**The Client owns:**

- the domain registrar account
- the GA4 and GTM accounts
- the Brevo account
- all lead data

**We own:**

- the Cloudflare Pages hosting, because the monorepo deploys every Client's site
- the code
- the theme and components; the Client gets a licence to use them in its exported build

**When a Client leaves, we hand over:**

- the static build
- the site definition
- a Client Knowledge Base export
- a lead export
- a documented DNS cutover

**Because our Worker processes and stores leads, we are a data processor for each Client.** So:

- Every Client signs a data processing agreement.
- Leads stored in our systems have a defined retention period.
- There is a defined process for exporting and deleting them.

We rejected two alternatives:

- **We own everything and resell it:** this locks Clients in and makes us the data controller.
- **The Client owns Cloudflare too:** this breaks deploying every site from one monorepo.

## Consequences

Cloudflare requires an apex domain on Pages to be a zone in the same Cloudflare account as the Pages project. That makes where DNS lives a real decision; see ADR-0012.

## Milestone

M1: ownership split (Client #0 is us, so no DPA). M2: DPA with the first paying Client. Exit handover: DESIGNED (documented only). See ADR-0039.
