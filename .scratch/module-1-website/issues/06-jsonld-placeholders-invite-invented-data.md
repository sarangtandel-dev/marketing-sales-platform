# JSON-LD templates have placeholders that invite invented data

Status: ready-for-agent
Source: file audit, 2026-09-17

## Problem

`templates/webflow/jsonld/local-business.html` has placeholders for:

- `priceRange` (:11)
- `geo` lat/lng (:20, unquoted, so the JSON is invalid until filled)
- opening hours, which default to Mon–Sat (:22)
- `areaServed` as a single city (:24)
- `hasMap` as the GBP URL (:25)

Also:

- `organization.html:11` assumes `sameAs` profiles on GBP, IG, FB and LinkedIn.
- `service.html:7,10` leaves `serviceType` and the description free-form.
- `faq.html` has exactly 3 fixed questions.

Any placeholder that is filled without a Publishable Fact breaks ADR-0007.

## To decide

- JSON-LD is generated only from Publishable Facts, and a field is left out, not guessed, when no Fact exists.
- `LocalBusiness` markup is emitted only when the local-presence Capability is on.
- There is never any Review/AggregateRating markup unless it comes from a verified source and follows Google's self-serving review policy.

2026-09-17, milestones (ADR-0039): Milestone M1. Client #0 is professional/B2B, so M1 needs `Organization`/`ProfessionalService`, `Service` and `FAQPage`, generated only from Publishable Facts. `LocalBusiness` (local presence) is M2.
