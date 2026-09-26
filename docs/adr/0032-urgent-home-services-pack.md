---
status: accepted
---

# Urgent home services pack

**Basics:**

- **schema.org type:** chosen from the Client's trade (`Plumber`, `Electrician`, `HVACBusiness`, `Locksmith`, `RoofingContractor`…), falling back to `HomeAndConstructionBusiness`.
- **Page types:** home, one page per service, a service-area hub, area pages (only with proof, per ADR-0027), an emergency page, about, contact.

**CTAs:**

- **Primary CTA:** `call`.
- **Secondary:** `message` and `quote_request`.

**Trust signals:**

| Signal | Status required |
|---|---|
| Trade licence and insurance | `publicly-verified` or `document-verified` |
| Trade body memberships | Not specified |
| Ratings | Not specified |
| Testimonials | Not specified |
| Photos of completed jobs | Rights recorded |
| Call-out fee policy | `client-stated` |

**Default Capabilities:** local presence and service area on; booking and multi-location off.

**Extra intake questions:**

- trades covered
- emergency hours
- the service area list
- licence and insurance details
- call-out fees
- typical response time

**Prohibited:**

- "24/7" without a 24/7 Fact
- response-time promises without a `document-verified` Fact
- addresses that aren't real
- prices without a current Fact

**Conversion goals:** call clicks (primary), callback requests, quote forms.

**Success metrics:** calls and quote requests per month.

**Call tracking:**

- Version 1 measures call **clicks** only.
- Dynamic number swapping for paid traffic is designed as a later Capability. It would keep the main number everywhere else, so name, address and phone stay consistent across listings.

## Milestone

M1 if the first paying Client is in urgent home services, otherwise M2. Dynamic number swapping: DESIGNED. See ADR-0039.
