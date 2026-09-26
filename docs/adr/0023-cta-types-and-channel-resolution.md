---
status: accepted
---

# CTAs are generic types; the channel comes from pack, then Region, then a Client choice backed by Facts

**CTA types:**

- `call`
- `message` (the channel is set separately)
- `email`
- `book`
- `quote_request`
- `consultation_request`
- `demo_request`
- `visit`
- `purchase` (reserved; not in version 1)

**How a site gets its CTAs:**

1. The Category Pack sets the primary CTA type and the allowed secondary types.
2. Region config ranks the messaging channels in common use.
3. The Client chooses from what's allowed. A channel must be backed by a Publishable Fact (for example a verified phone or WhatsApp Business number).
4. `message` and `book` only point to accounts the Client owns.

**Rules:**

- **Form fallback:** every page offers a form-based fallback CTA. It can be a link to a form page; a full form on every page isn't required.
- **Outside business hours:** `call` becomes "request a callback", unless the Client has a 24/7 Fact.
- **Time zone:** business hours are checked in the time zone of the Client's **location**, not the Visitor's.

## Milestone

M0: the CTA types our site uses, written directly in the site definition. M1: CTA resolution from pack, Region and Facts. M2: the `call` business-hours rule, unless the first paying Client needs it. `purchase`: DESIGNED. See ADR-0039.
