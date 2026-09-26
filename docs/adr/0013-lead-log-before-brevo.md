---
status: accepted
---

# The Worker stores every lead in the Lead Log before delivering it to Brevo

**The form Worker works in this order:**

1. Run the spam checks (honeypot and a server-side Turnstile check).
2. Write the raw submission to a per-Client **Lead Log** in Cloudflare.
3. Only then tell the Visitor the submission succeeded.
4. Deliver the lead to Brevo, with retries and backoff. After the final failed attempt, we get an alert.

**Other rules:**

- Brevo, owned by the Client, remains the lasting record.
- Lead Log entries, including the delivery result, are deleted automatically after **90 days**. Export and deletion on request follow a documented procedure (ADR-0011).
- Spam rejections are counted for reporting but never stored.
- The owner's alert about a new lead is sent from the Lead Log path, so it does not depend on Brevo succeeding.
- **Data residency:**
  - The Lead Log is stored in D1.
  - Clients with EU Served Regions use D1's enforced `eu` jurisdiction.
  - Lead data never goes into KV or Queues. KV's EU option is a private beta that can still cache reads outside the EU, and Queues' EU guarantee isn't documented.
  - The default location for other Clients is set in ADR-0029.
- **Processing outside the EU:** Workers run at edge locations worldwide, and keeping them in the EU needs the Enterprise Data Localization Suite. So EU leads are *processed* outside the EU even though they're *stored* inside it.
- **DPA contents:** each Client's DPA must state that processing location and list every sub-processor with where it processes data (Cloudflare, Brevo, the consent tool).

## Considered options

- **Pass-through with no storage:** rejected. A Brevo outage would silently lose leads.
- **Making our store the lead database:** rejected. It makes us the long-term holder of Client lead data, which conflicts with ADR-0011.

## Milestone

M0: D1 Lead Log, Brevo delivery with retries, idempotent lead ID, owner alert, 90-day purge. M1: DPA sub-processor list. EU jurisdiction path: DESIGNED. See ADR-0039.
