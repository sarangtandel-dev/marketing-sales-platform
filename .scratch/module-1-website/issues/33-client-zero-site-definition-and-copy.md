# 33: Client #0 site definition and copy

**What to build:** The agency's real site is described in its site definition: home, services, about, contact, privacy policy page and 404. It has real copy, the primary CTA `consultation_request`, the contact form with the email opt-in, and the Client #0 Theme. Every claim is backed by a Fact in the facts file (ADR-0033, ADR-0039).

**Blocked by:** 25, 29, 30, 31, 32

Status: ready-for-human

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] Every page is in the site definition with SEO title and description, and the build passes
- [ ] The primary CTA is `consultation_request`, and the secondary CTAs follow ADR-0033 (`book` calendar link, `email`)
- [ ] Form fields follow ADR-0033: company, role, company size, one need question, and no budget question
- [ ] Every claim in the copy matches a Fact in the facts file, and High-risk Claims are `publicly-verified` or `document-verified`
- [ ] No superlatives appear without a third-party Source. Any hand-written JSON-LD follows issue 06's rules
- [ ] Every image has alt text and recorded rights, and no AI image shows real people, premises or work (ADR-0018)
- [ ] The page structure is recorded as input to the M1 professional/B2B pack
