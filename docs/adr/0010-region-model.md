---
status: accepted
---

# Regions are countries with optional state/province overrides; each Client has one Home Region and several Served Regions

A Region is an ISO 3166-1 country, optionally narrowed to an ISO 3166-2 state or province. Region configs are shared, versioned files in the monorepo, one per Region code. Each Client has one Home Region and a list of Served Regions:

- The **Home Region** sets phone, currency, address and time-zone formats.
- The **Served Regions** decide privacy and consent rules.

We need state/province granularity because privacy law differs within a country (US state laws, Quebec's Law 25). We keep Home and Served separate because where the Client is based and where its Visitors come from are different questions: a UK consultancy serving EU and US clients formats its own address the UK way but must follow GDPR and US state rules.

## Milestone

M1 See ADR-0039.
