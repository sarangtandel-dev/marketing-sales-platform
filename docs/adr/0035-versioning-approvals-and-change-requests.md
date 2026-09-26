---
status: accepted
---

# Site definition versions, approval gates, change requests and shared component changes

**Versions.** Each Client's site definition is tagged `<slug>/vMAJOR.MINOR.PATCH`.

| Level | What changes | What it needs |
|---|---|---|
| **Major** | Pages, Pack Version, Theme, Served Regions | Full QA and Client sign-off |
| **Minor** | Copy, changed Fact values, new Media | A `changes.yaml` entry and Client approval on a preview deployment |
| **Patch** | Removed expired or withdrawn Facts, security fixes | Nothing; publishes automatically |

Preview deployments use test keys and are noindex.

**Change requests:**

- A Client asks by email or through our own intake.
- Each request is logged in `changes.yaml` with who asked, the date, what they asked for, its status, and a reference to the approval evidence.
- Each Client names one approver in `client.yaml`.

**Rollback:** we roll back to a previous Pages deployment and log it as a change.

**Approval gates:** our team plus the Client's approver sign off the strategy brief, and QA before launch.

**Shared component changes:**

- Changes to shared components are versioned.
- Before a component change ships, **screenshot comparisons run across every Client site**. This starts in M2, once there are at least two Clients.
- Any visual difference is reviewed by a person and never published automatically.
- This protects the benefit of the monorepo (ADR-0003) without letting one fix quietly change 100 sites.

## Milestone

M0: git history and Pages rollback; our team approves. M1: `changes.yaml`, version tags and the Client approval flow. M2: screenshot comparison. See ADR-0039.
