---
status: accepted
---

# What a Category Pack defines, and pinned pack versions

**What a pack defines:**

- the page types it generates
- required and optional sections per page type
- the primary CTA type and the allowed secondary CTA types
- trust signal types, each with the Verification Status it requires
- its schema.org type
- the Capabilities it switches on by default
- intake questions it adds to the base intake
- conversion goals, mapped to tracking events
- **prohibited claims and content rules** (required)
- success metrics

**Versioning:**

- Packs are versioned, and each Client pins a pack version.
- Moving a Client to a new pack version is an explicit, reviewed change to that Client, never a side effect of editing the pack.
- Without pinning, a change to a pack's sections or claim rules would silently change live Client sites in regulated categories.

## Milestone

M1. Pack upgrade workflow: DESIGNED. See ADR-0039.
