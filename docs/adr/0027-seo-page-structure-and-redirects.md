---
status: accepted
---

# Pages are generated only when enough Publishable Facts back them; migrations must redirect every indexed URL

**Service pages:**

- One page per offering, **only** when it has a description plus at least three specifics: process, what's included, FAQs or proof.
- Otherwise the offering appears on a services overview page.

**Location pages** (only when local presence is switched on):

- One page for each physical location.
- Service-area town pages only with proof specific to that area. Never a template with the town name swapped in.
- No service × location combination pages in version 1.

**Professional/B2B pack:** service pages, "industries served" pages (only when backed by case studies), and case study pages.

**Blog:** not part of version 1 site builds; content production belongs to the marketing module. Existing articles can be migrated.

**Languages in URLs:** the default language sits at the root and other languages go under `/<lang>/`, with hreflang tags generated automatically.

**Thin pages:** the build blocks any page below its pack's content minimum. It never publishes a thin page with a "noindex" tag instead.

**Migrating Clients:**

- A Client moving from an old site gets a **redirect map**: every indexed URL on the old site gets a 301 redirect to the best matching new page.
- **The build fails** if an old indexed URL has neither a redirect nor a recorded decision to drop it.

## Milestone

M1: B2B page structure, plus a Redirect Map if our current domain has indexed URLs. M2: location and service-area pages. See ADR-0039.
