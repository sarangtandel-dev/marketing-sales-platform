---
status: accepted
---

# Dental clinic pack

This pack is **regulated** (ADR-0030).

**Basics:**

- **schema.org type:** `Dentist`
- **Page types:** home, one page per treatment, new patients (what to expect, payment and insurance), team, locations, contact, FAQ, legal

**CTAs:**

- **Primary CTA:** `book`. When the Client has no online booking tool it falls back to `call`.
- **Secondary:** `call`, `message`, and a form.

**Trust signals:**

| Signal | Status required |
|---|---|
| Each clinician's registration with the dental regulator | `publicly-verified` from the regulator's register |
| Qualifications and memberships | `publicly-verified` or `document-verified` |
| Ratings | `publicly-verified`; Time-sensitive |
| Testimonials | Subject to the region overlay |
| Named team members | With their consent |
| Payment options and insurance accepted | `client-stated` |

**Default Capabilities:** local presence and booking on; service area and multi-location off.

**Extra intake questions:**

- each clinician's regulator and registration number
- treatments offered
- emergency availability
- payment plans and insurance
- accessibility
- languages spoken

**Prohibited:**

- before/after images without written consent
- outcome guarantees
- "painless" or "best" wording
- "specialist" unless registered as one
- prices, unless `client-stated` with a Refresh-by Date

**Conversion goals:**

- booking started (click to the booking tool)
- booking confirmed (only if the booking tool can report it back)
- `contact_click` for call
- form submitted

**Success metrics:** booking requests per month, the site's conversion rate, call clicks.

## Health data rules

**Forms:**

- Dental forms offer only general enquiry types: new patient, appointment request, emergency, general question.
- They have **no** free-text fields for medical details or treatment history.
- A short notice near each form asks Visitors not to share health information.

**Legal status:**

- Submissions to health-related packs may still be **special category data** under GDPR, and US clinics may fall under **HIPAA**. The Lead Log, the DPA and the Privacy Law Profiles must allow for this.
- Before onboarding any US dental Client, check and record Brevo's current HIPAA position, including whether it signs Business Associate Agreements (issue 16).

## Milestone

M2. US dental Clients are blocked by issue 16. See ADR-0039.
