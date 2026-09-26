---
status: accepted
---

# Every Fact carries a Source and a Verification Status, and only Publishable Facts reach a site

A site may state only facts the Client told us or facts we verified from a public source. Each Fact records its Source and its Verification Status (`client-stated`, `publicly-verified`, `document-verified`, `unverified`, `rejected`). The build refuses any Fact that is not publishable. We never invent reviews, prices or credentials.

Additional rules:

- **High-risk Claims** (licences, certifications, awards, years in business, rankings, medical/financial outcomes) must be `publicly-verified` or `document-verified`. Superlatives ("best", "#1") are published only when a third-party Source supports them.
- **Time-sensitive Facts** (ratings, review counts, years in business, team size) store a confirmed or retrieved date and a Refresh-by Date. After that date they are hidden from the site until someone confirms them again.
- **Testimonials** need a Permission Record stored with the Testimonial, or a verifiable public Source.

## Considered options

We rejected trusting everything the Client says. Many markets regulate health, financial and credential claims, and the liability falls on whoever publishes the site.

## Milestone

M0: Facts carry `source` and `status`, checked by JSON Schema only, and publishing is enforced by manual review. M1: the build enforces the publishing rules. See ADR-0039.
