---
status: proposed
---

# Claude Design output becomes a per-Client Theme over one shared component library

**Design flow:**

- One shared Claude Design design-system project mirrors our component library and is kept in sync with `/design-sync`.
- For each Client, Claude Design produces a design specification: colours, type, spacing, radius, shadows, logo use, and a choice of section variants our library supports.
- That specification becomes the Client's **Theme** file of design tokens.
- Components are never forked for one Client. A design that needs a component we lack becomes a proposal to add it to the shared library.
- Every Theme passes an automated WCAG AA colour contrast check before approval.

We rejected building custom components per Client and rebuilding designs by hand from screenshots. Custom components would throw away the monorepo's shared-fix benefit (ADR-0003); hand rebuilds are slow and drift from the design.

**Status is `proposed`** until a small test proves `/design-sync` works end to end in our setup. If it fails, we fall back to exporting design specs from Claude Design and converting them into tokens by hand.

## /design-sync spike result

_Not yet run._

## Milestone

M1, after the `/design-sync` test (issue 12). See ADR-0039.
