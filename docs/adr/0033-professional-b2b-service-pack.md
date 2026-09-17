---
status: accepted
---

# Professional/B2B service pack

This pack is not local by default: local presence is off.

**Basics:**

- **schema.org type:** `ProfessionalService`, or a subtype such as `AccountingService` or `LegalService`. Legal and financial subtypes are **regulated** (ADR-0030).
- **Page types:** home, one page per service, "industries served" (only with case studies), case studies, about and team, migrated insights, contact.

**CTAs:**

- **Primary CTA:** `consultation_request` or `demo_request`; the Client picks one.
- **Secondary:** `book` (a calendar link) and `email`.

**Trust signals:**

| Signal | Status required |
|---|---|
| Client logos and case studies | A Permission Record from the organisation named |
| Certifications and partner badges | `publicly-verified` against the partner's directory |
| Team credentials | Not specified |
| Review-platform ratings | Time-sensitive |

**Extra intake questions:**

- ideal customer profile
- services and how engagements work
- case studies and their permissions
- partner programmes
- whether the profession is regulated

**Prohibited:**

- client logos or names without permission
- ROI or results figures unless `document-verified`
- regulated titles or advice without the overlay's disclaimers

**Form fields:** company, role, company size, and one question about the need. No budget question by default.

**Conversion goals:** a qualified consultation or demo request, and a completed booking.

**Success metrics:** qualified requests per month, and meetings booked.

This pack widens **Permission Record** to cover any named person *or organisation* agreeing to be quoted or shown.

## Milestone

M1 (Client #0). See ADR-0039.
