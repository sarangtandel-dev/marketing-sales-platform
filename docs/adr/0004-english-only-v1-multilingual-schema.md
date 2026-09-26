---
status: accepted
---

# Version 1 content is English only, but the schema supports many languages

Version 1 sites publish English only. From day one, the knowledge base and site definition schemas store every piece of text visitors see keyed by language. Adding languages to a working schema later would mean migrating every Client, whereas adding the language keys now costs almost nothing.

## Milestone

M0: language-keyed text in the minimal site definition schema. M1: the language-key build check. Publishing a second language: DESIGNED. See ADR-0039.
