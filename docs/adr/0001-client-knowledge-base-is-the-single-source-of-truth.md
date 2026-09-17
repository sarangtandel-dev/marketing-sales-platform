---
status: accepted
---

# The Client Knowledge Base is the single source of truth

Each Client has one Client Knowledge Base under `/clients/<slug>/`. Every module (website, lead capture/CRM, marketing automation, reporting) reads Client facts from it. No module keeps its own copy of those facts. If each module kept its own copy, a Client's name, phone number, services and claims would drift apart across the website, CRM and email. We accept that the knowledge base schema has to serve modules that haven't been designed yet.

## Milestone

M1 See ADR-0039.
