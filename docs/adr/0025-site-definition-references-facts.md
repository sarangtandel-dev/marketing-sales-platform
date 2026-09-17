---
status: accepted
---

# Site definitions refer to Facts by ID; rebuilds are triggered by Fact changes

**Sections cite Fact IDs.** Each build pulls in the current values and applies the publishing rules (ADR-0007).

**When a site rebuilds** (from M2; in M1 an expiry check is run by hand before every deploy, per ADR-0038):

- A scheduled job rebuilds a Client **only** when one of its Facts has changed or reached its Refresh-by Date.
- There are no blanket daily rebuilds. At 100 Clients those would use about 3,000 builds a month, which is above the Pro plan's share once normal deploys are added (see ADR-0003 for the plan limits).
- Without these rebuilds, a static site would keep showing expired Facts.

**Publishing rules:**

- **Automatic:** a rebuild that only **removes** an expired or withdrawn Fact from the site publishes on its own.
- **Needs approval:** a rebuild that **changes** a Fact value shown on the site needs an entry in `changes.yaml` and approval first.
- **Missing Facts:** a block whose Fact is missing or expired is left out, never shown empty.

**QA claim check:** QA flags any number, superlative, credential, guarantee, or medical or financial wording in free text that isn't a Fact reference. A person must turn each one into a Fact reference or remove it.

We rejected copying Fact values into the site definition. Copies drift from the knowledge base and keep showing expired Facts.

## Milestone

M1: Fact references, the publishing rules, and an expiry check run by hand before every deploy. M2: scheduled rebuild job. See ADR-0039.
