---
status: accepted
---

# Module 1 stack: Astro + Tailwind on Cloudflare, Brevo, GA4 + GTM

Sites are Astro + Tailwind builds, generated from a validated site definition JSON and hosted on Cloudflare Pages. A Cloudflare Worker handles form submissions. Brevo is the CRM and email tool, and measurement uses GA4 through GTM. This replaces the Phase 0 rented stack of Webflow, HubSpot and Make. Once sites are generated from a site definition instead of assembled in a visual builder, Webflow's editor adds nothing and its per-site cost doesn't scale. Make and HubSpot are replaced by the Worker and Brevo, so we run fewer paid tools per Client.

## Consequences

The Phase 0 docs and templates (`docs/01`–`06`, the appendices, `templates/webflow`, `templates/make`, and the GTM/Brevo/privacy templates) still refer to Webflow, HubSpot and Make. They have to be rewritten. Three jobs Make did need a new home: the spam (honeypot) check, the raw lead audit log, and syncing deal stage into Brevo. See `.scratch/module-1-website/issues/`.

## Milestone

M1 See ADR-0039.
