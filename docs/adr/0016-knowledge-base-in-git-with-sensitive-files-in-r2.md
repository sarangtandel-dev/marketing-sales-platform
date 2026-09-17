---
status: accepted
---

# The Client Knowledge Base keeps structured Facts in git and sensitive or binary files in R2

`/clients/<slug>/` lives in the monorepo as YAML files validated by JSON Schema.

**Stored in per-Client Cloudflare R2, not git; git holds only references:**

- Permission Records and consent forms
- the documents behind `document-verified` Facts
- original media files
- lead exports

Git gives history and reviewable diffs for Facts. Personal data and signed documents must never enter git history, because git can't truly delete them, which would break the deletion promise in ADR-0011.

**How this is enforced:**

- Pre-commit hooks and CI checks block personal data, secrets and binary files from being committed.
- R2 access is scoped to each Client.
- Files for Clients with EU Served Regions use EU storage where Cloudflare supports it.

## Considered options

- **Everything in git:** rejected because of the deletion problem above.
- **A database from day one:** rejected for now. It gives up diffs and review before we know the schema is stable.

## Milestone

M1 See ADR-0039.
