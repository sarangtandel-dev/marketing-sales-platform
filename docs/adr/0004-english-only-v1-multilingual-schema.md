---
status: accepted
---

# Version 1 content is English only, but the schema supports many languages

Version 1 sites publish English only. From day one, the knowledge base and site definition schemas store every piece of text visitors see keyed by language. Adding languages to a working schema later would mean migrating every Client, whereas adding the language keys now costs almost nothing.

## Milestone

M1: language-keyed schema and the language-key build check. Publishing a second language (`/<lang>/` routes, hreflang): DESIGNED. See ADR-0039.
