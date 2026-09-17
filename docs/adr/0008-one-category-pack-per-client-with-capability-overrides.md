---
status: accepted
---

# One Category Pack per Client; Capabilities are overridable defaults

Each Client has exactly one Category Pack. The pack switches a set of Capabilities on by default (local presence, service area, booking, multi-location), and each Client can override them. Local features are never on unless the pack or the Client turns them on. We rejected mixing several packs per Client because the choice of sections, primary CTA and schema.org type becomes ambiguous. Hybrid businesses are handled by overriding Capabilities.

## Milestone

M1 See ADR-0039.
