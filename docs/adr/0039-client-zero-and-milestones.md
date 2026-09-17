---
status: accepted
---

# Client #0 is our own agency site; version 1 ships in two milestones

We have no paying Client yet. **Client #0 is our own agency website.**

**Client #0 setup:**

- **Pack:** professional/B2B service, not regulated.
- **Home Region and Served Region:** India (`IN`).
- **Domain and DNS:** our own domain with standard DNS.
- **Approver:** our team.

**Consequences of being our own Client:**

- We are the data controller, so no DPA is needed. Our own privacy notice applies.
- The site still goes through every gate, so the pipeline is proven before a paying Client relies on it.
- With no paying Clients yet, we have few Testimonials, case studies or client logos. Many B2B trust sections and "industries served" pages won't render. That exercises the "leave the block out" rule (ADR-0025) and the content minimums (ADR-0027), and it is expected.

**Milestone 1: Client #0 live end to end.**

- The professional/B2B pack.
- India only.
- English only.

**Milestone 2: first paying Client.**

- **Packs:** dental and urgent home services, plus Region Overlays and the Regulated Pack gate.
- **Regions:** GB and US (with US-CA).
- **Automation:** the scheduled rebuild job and screenshot comparison.
- **DNS:** nameserver cutover into our account, with the cutover checklist.
- **Paperwork:** DPA and sub-processor list.

**DESIGNED ONLY:** recorded, not scheduled.

## Milestone per ADR

| ADR | Decision | Milestone |
|---|---|---|
| 0001 | Knowledge base is the single source of truth | M1 |
| 0002 | Stack | M1 |
| 0003 | Monorepo, one Pages project per Client | M1 · scaling past 100 Clients: DESIGNED |
| 0004 | English only, multilingual schema | M1 schema and language-key check · second-language publishing: DESIGNED |
| 0005 | Human-led intake | M1 |
| 0006 | Claude Design | M1 |
| 0007 | Fact provenance and publishing rules | M1 |
| 0008 | One pack, Capability overrides | M1 |
| 0009 | Version 1 packs | M1 B2B · M2 dental, home services |
| 0010 | Region model | M1 |
| 0011 | Ownership and exit | M1 ownership (Client #0) · M2 DPA · exit handover: DESIGNED |
| 0012 | DNS in our account | M1 standard DNS on our own domain · M2 nameserver default and cutover checklist · www-CNAME fallback: DESIGNED |
| 0013 | Lead Log before Brevo | M1 · EU jurisdiction path: DESIGNED (no EU Served Region planned) · M2 sub-processor list in the DPA |
| 0014 | Region config and Privacy Law Profiles | M1 IN (DPDP) · M2 GB, US, US-CA · others: DESIGNED |
| 0015 | Pack definition and versioning | M1 pinning · upgrade workflow: DESIGNED |
| 0016 | Git plus R2, personal data checks | M1 |
| 0017 | Research limits | M1, run by hand · scheduled refresh: DESIGNED |
| 0018 | Media rights, AI images | M1 · patient-image consent: M2 |
| 0019 | Claude Design handover | M1, after the issue 12 test |
| 0020 | Consent banner by Region | M1 for IN · M2 GB, US behaviour |
| 0021 | Opt-ins on forms | M1 email · SMS, WhatsApp, double opt-in: DESIGNED until a Client needs them |
| 0022 | Tracking rules and tests | M1 |
| 0023 | CTA types and resolution | M1 B2B types plus form fallback · M2 `call` business-hours rule · `purchase`: DESIGNED |
| 0024 | Knowledge base layout and Fact shape | M1 |
| 0025 | Fact references | M1 references plus an expiry check run by hand before deploy · M2 scheduled rebuild job |
| 0026 | Listings | M1 profile Facts for `sameAs` · M2 local listings audit · APIs: DESIGNED |
| 0027 | SEO structure, Redirect Map | M1 B2B pages, plus a Redirect Map if our current domain has indexed URLs · M2 location and area pages |
| 0028 | Turnstile grouping | M1 |
| 0029 | Lead Log location outside the EU | M1 |
| 0030 | Region Overlays, Regulated Packs | M2 (Client #0 isn't regulated) |
| 0031 | Dental pack | M2 (US dental blocked by issue 16) |
| 0032 | Home services pack | M2 · dynamic number swapping: DESIGNED |
| 0033 | Professional/B2B pack | M1 |
| 0034 | Site definition outline | M1 |
| 0035 | Versions, approvals, Change Requests | M1 · M2 screenshot comparison |
| 0036 | Module 2 contracts | M1 one combined contract file, idempotent lead ID, Brevo delivery · three separate files when Module 2 starts: DESIGNED · signed webhook: DESIGNED |
| 0037 | Pipeline skills | M1 |
| 0038 | Manual vs automated | M1 · M2 scheduled rebuild, screenshot comparison |
| 0039 | Client #0 and milestones | M1 |
