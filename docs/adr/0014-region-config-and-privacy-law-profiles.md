---
status: accepted
---

# Region configs hold locale and operational rules; privacy laws are separate shared profiles

**Region config.** Each Region has a shared config file with:

- **Formats:** phone (calling code, E.164 validation, display format), currency (ISO 4217 code and format), address (field order, postal label and pattern, required fields), date/time format, units, and allowed time zones.
- **Business ID:** its label and format.
- **Messaging channels:** the ones in common use, ranked, plus the legal rules for contacting people on each.
- **Privacy law IDs:** which laws apply.
- **Consent model:** opt-in or opt-out, and whether a cookie banner is required.
- **Children and data requests:** the age threshold for children, and how long the Client has to answer a data request.
- **Required pages or notices.**
- **Listing platforms that matter there.**

State and province configs inherit from their country and override only what differs.

**Privacy law profiles.** What a privacy law requires lives in a separate profile file per law (GDPR, UK GDPR, CCPA/CPRA, DPDP, LGPD, PIPEDA/Law 25…). A Region only references them by ID, because one law covers many Regions.

**Legal fields are operational configuration, not legal advice:**

- Every law profile and every legal field records who reviewed it and when.
- A law profile must be reviewed by a qualified person before it is used for any Client.

**Fallback.** Visitors from an unknown Region, or a Region not in the Client's Served Regions, get the **strictest** consent rules among that Client's Served Regions.

## Milestone

M1: region config and Privacy Law Profile for India and for the first paying Client's Region. M2: other planned Regions (GB, US, US-CA) not already built. M0 has no region machinery; our own privacy policy is written by hand. See ADR-0039.
