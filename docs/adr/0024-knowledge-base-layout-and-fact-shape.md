---
status: accepted
---

# Knowledge base file layout and the shape of a Fact

**`/clients/<slug>/` contains:**

- `client.yaml`:
  - identity: slug, legal name, trading names
  - Pack Version, Home Region, Served Regions, languages, Capability overrides
  - DNS mode, DPA reference, status
- `facts/`, one file per topic:
  - `business`: description, founding date, business IDs, contact points, opening hours
  - `offerings`: services
  - `locations`: only when local presence is on
  - `people`: business role only
  - `credentials`
  - `proof`: Testimonials, case studies, ratings, press, client logos
  - `faqs`
  - `policies`: pricing stance, guarantees, payment methods
- `media.yaml`: Media Items, pointing to R2
- `listings.yaml`
- `research/<date>.yaml`
- `brief/`: the strategy brief and its approval record
- `design/`: the Theme and a reference to the design specification
- `site/`: the site definition
- `dns.yaml`: the DNS record inventory
- `changes.yaml`: the change and approval log

**Every Fact has:**

- a stable `id`, which is **never reused**
- a `value`, with any text keyed by language
- a `source`: its type, who/URL/document reference, and date
- a `status`
- `verified_by` and `verified_at`
- `refresh_by`, where it applies
- a `kind`, which decides whether it counts as a High-risk Claim or a Time-sensitive Fact

**People:** a `people` Fact that names a staff member on the site, or shows their photo, needs recorded consent from that person. The consent is stored in R2 like a Permission Record.

Stable IDs matter because site definitions and later modules refer to Facts by ID (ADR-0025).

## Milestone

M1. M0 uses a single facts file. See ADR-0039.
