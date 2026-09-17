---
status: accepted
---

# Module 1 publishes versioned contracts for Leads, events and the Brevo mapping

Module 1 publishes versioned contracts in the monorepo covering the three areas below. In M1 they are **one combined file**; it is split into three when Module 2 starts.

**1. The Lead record:**

- lead ID, Client, form ID, `form_type`, CTA Type
- the fields submitted
- Marketing Opt-ins, with the version of the wording shown
- Consent state
- attribution: first and last touch, click IDs, landing page, referrer, `ga_client_id`
- detected Region, language, page URL, submission time

**2. The event list:** dataLayer events and their parameters, plus each pack's conversion goals mapped to events.

**3. The Brevo mapping:** attribute names, list naming and opt-in fields.

**What happens in version 1:**

- The Worker delivers leads to Brevo and sends owner alerts.
- A signed "lead received" webhook is designed but stays **switched off** until Module 2 subscribes.
- Syncing deal stage and meetings belongs to Module 2.

**The lead ID is an idempotency key.** Brevo delivery and the Module 2 webhook must never create a duplicate lead when they retry.

**Changing a contract:** a change that breaks compatibility needs a major version and an ADR.

## Milestone

M1: **one combined contract file**, idempotent lead ID, Brevo delivery. Splitting it into three files when Module 2 starts: DESIGNED. Signed webhook: DESIGNED. See ADR-0039.
