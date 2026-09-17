---
status: accepted
---

# Lead Logs for Clients without EU Served Regions use a D1 location hint near the Home Region

**Location:**

- These Clients' Lead Logs use a D1 **location hint** near their Home Region.
- A location hint is best effort, not a guarantee, and each Client's DPA says so.
- Clients with EU Served Regions keep the enforced `eu` jurisdiction (ADR-0013).

**Countries with data localisation laws:** region config can override the location. The override is added when such a Region is added.

**Rejected options:**

- **One fixed default location:** rejected. It puts lead data far from Clients for no reason.
- **`eu` for everyone:** rejected. It is stricter than most Clients need and ties every Client to EU-only storage.

## Milestone

M1 See ADR-0039.
