# Confirm which Cloudflare storage products can guarantee EU residency

Status: ready-for-agent
Source: ADR-0013, ADR-0016, 2026-09-17

## Problem

Under ADR-0013 and ADR-0016, the Lead Log and R2 files for Clients with EU Served Regions must be stored in the EU "where Cloudflare supports it". We don't yet know which storage products (D1, R2, KV, Queues, Durable Objects) offer a jurisdiction guarantee, which offer only a location hint, and which features need an Enterprise plan.

## To decide

- Pick a Lead Log storage product that can guarantee EU residency, or record the limitation in the DPA.

Research in progress (2026-09-17).

## Comments

2026-09-17, research findings (developers.cloudflare.com):

| Product | EU option | Strength |
|---|---|---|
| **R2** | `eu` jurisdiction | **Guaranteed** |
| **D1** | `eu` jurisdiction | Enforced; read replicas stay in the jurisdiction. Location hints alone are best effort. Doesn't combine with the Enterprise Data Localization Suite's Customer Metadata Boundary feature. |
| **Durable Objects** | `eu` jurisdiction | Enforced |
| **KV** | EU jurisdiction | Private beta. Covers durable storage only; reads can be cached outside the EU. **Don't use for the Lead Log.** |
| **Queues** | `jurisdiction` field in the API | Guarantee not documented. **Unverified.** |

- **Workers run worldwide.** Limiting where they run (Regional Services) needs the Enterprise-only Data Localization Suite. So EU lead data is *processed* at edge locations outside the EU even when it is *stored* in the EU. The DPA must say this.

Suggested direction:
- Lead Log on D1 with the `eu` jurisdiction for Clients with EU Served Regions.
- R2 buckets with the `eu` jurisdiction for their files.
- Avoid KV and Queues for lead data until their EU guarantees are confirmed.

2026-09-17: decided in ADR-0013. The Lead Log uses D1 with the `eu` jurisdiction, and KV and Queues are excluded. The default location for non-EU Clients is still open (Round 4).

2026-09-17, milestones (ADR-0039): M1 uses a D1 location hint near India (ADR-0029). The EU jurisdiction path is DESIGNED, because no EU Served Region is planned. GB is not in the EU, so M2 GB Clients also use a location hint.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0:** D1 location hint near India. The EU path is DESIGNED.
