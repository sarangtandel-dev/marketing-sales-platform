---
status: accepted
---

# Research collects only business-level public information and never publishes by itself

**What research may collect:**

- the Client's own site and social profiles
- business registries and licensing bodies
- Google Business Profile and major listings
- press coverage
- competitor names, URLs and positioning, for the strategy brief only

**How findings are handled:**

- Every finding is stored as `unverified`, with its URL and the date it was retrieved.
- In version 1, a person promotes it to `publicly-verified`.

**How research behaves:**

- It respects robots.txt and site terms of service.
- It uses official APIs where they exist.

**Research never:**

- collects personal data beyond a person's business role
- accesses anything behind a login
- copies competitor or review text
- publishes anything about competitors
- turns scraped reviews into Testimonials

**Refresh:**

- Time-sensitive Facts get a 90-day Refresh-by Date by default; each pack can override it.
- A full research pass runs at onboarding, yearly, and before each major version of the site definition.

## Milestone

M1, run by hand. Scheduled refresh: DESIGNED. See ADR-0039.
