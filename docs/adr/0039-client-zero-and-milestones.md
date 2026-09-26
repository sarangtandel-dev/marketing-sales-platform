---
status: accepted
---

# Client #0 is our own agency site; version 1 ships as M0, M1 and M2

We have no paying Client yet. **Client #0 is our own agency website.**

**Client #0 setup:**

- **Pack:** professional/B2B service, not regulated.
- **Region:** India (`IN`) is its Home Region and Served Region.
- **Domain:** our own domain, with standard DNS.
- **Approver:** our team.

We are the data controller for Client #0, so no DPA applies, and our own privacy policy covers the site.

**Why three milestones:** the earlier plan put 10–15 weeks of pipeline work before our own site went live, with no paying Client to justify it. So the platform is built in three steps:

- **M0:** our site goes live quickly, built the way the platform will work.
- **M1:** the machinery gets built only when a paying Client needs it.
- **M2:** the remaining packs, Regions and automation for scale.

## M0: Client #0 live and capturing real leads safely (target 2–3 weeks)

**Includes:**

- **Site definition:** a minimal JSON Schema (pages, sections, variants, CTAs, forms, language-keyed text) and a hand-written site definition for Client #0.
- **Theme:** tokens from Claude Design, exported by hand if the `/design-sync` test (issue 12) isn't done.
- **Components:** only the shared components our site needs (target 6–8), with variants.
- **Build and hosting:** an Astro build from the site definition, deployed to Cloudflare Pages, with a 404 page, `sitemap.xml` and `robots.txt`. Preview deployments get `X-Robots-Tag: noindex` by default (Cloudflare docs, checked 2026-09-17).
- **Worker:**
  - honeypot plus Turnstile
  - D1 Lead Log (location hint near India)
  - Brevo delivery with retries and an idempotent lead ID
  - an owner alert that doesn't depend on Brevo
  - 90-day purge
- **Tracking:** the rewritten tracking script with tests (issues 01–05, 07, 14), and GA4 via GTM.
- **Privacy:** a privacy policy for our own site, and an unticked email marketing opt-in with its wording version stored.
- **Facts:** a simple facts file for Client #0: YAML with `source` and `status` fields, validated by JSON Schema only.
- **Monitoring:** a daily test form submission, with an alert if the lead doesn't reach both the Lead Log and Brevo.

**Excluded (moved to M1):**

- the claim check and the meaning check
- the pack format
- the region config and Privacy Law Profile machinery
- the eight pipeline skills
- the contract file
- the Fact expiry command
- generated legal pages

**How M0 still follows the publishing rules (ADR-0007):** the M0 site definition holds its text directly, with no Fact references. A person checks every claim on the site against the facts file before launch.

**Open decisions for M0** (issue 19): a consent signal for GA4, a secrets check on commits, manual alt-text/rights and contrast checks, uptime checks, the owner alert channel, review of our privacy policy, and whether Client #0 counts toward the M1 skill-build rule.

## M1: triggered by the first paying Client

**Contents:**

- everything excluded from M0
- the first paying Client's pack, its Region, and any Region Overlay
- the professional/B2B pack formalised from Client #0
- the DPA and sub-processor list
- the nameserver default and cutover checklist
- `changes.yaml` and the Client approval flow
- the manual Fact expiry command

**Build rule:** **each pipeline skill is built only after its step has been done manually for a real Client at least once.** Until then, the step is done by hand, following ADR-0037's inputs and outputs.

**Migrating Client #0:** its site definition moves to Fact references and onto the formal B2B pack during M1.

## M2: breadth and automation for scale

- the remaining packs and Regions not pulled into M1 (from dental, urgent home services, GB, US, US-CA)
- the scheduled rebuild job
- screenshot comparison across Clients (it only means something with two or more Clients)
- the `call` business-hours rule and the local listings audit, if M1 didn't need them

**DESIGNED ONLY:** recorded, not scheduled.

## Milestone per ADR

| ADR | Decision | M0 | M1 | M2 / DESIGNED |
|---|---|---|---|---|
| 0001 | Knowledge base is the source of truth | One facts file | Full layout | |
| 0002 | Stack | ✔ | | |
| 0003 | Monorepo, one Pages project per Client | ✔ | | Scaling: DESIGNED |
| 0004 | English only, multilingual schema | Language-keyed text | Language-key check | Second language: DESIGNED |
| 0005 | Human-led intake | Informal | ✔ | |
| 0006 | Claude Design | ✔ | | |
| 0007 | Fact provenance and publishing | `source`/`status`, manual review | Build-enforced | |
| 0008 | One pack, Capabilities | | ✔ | |
| 0009 | Version 1 packs | | First paying Client's pack plus B2B | Remaining packs: M2 |
| 0010 | Region model | | ✔ | |
| 0011 | Ownership and exit | Client #0 is us | DPA | Exit: DESIGNED |
| 0012 | DNS | Own domain, standard DNS | Nameserver default and cutover checklist | CNAME fallback: DESIGNED |
| 0013 | Lead Log before Brevo | ✔ | Sub-processor list | EU path: DESIGNED |
| 0014 | Region config, Privacy Law Profiles | Hand-written privacy policy | IN plus the first paying Client's Region | Others: M2 |
| 0015 | Pack definition and versioning | | ✔ | Upgrade workflow: DESIGNED |
| 0016 | Git plus R2, commit checks | Secrets check? (issue 19) | ✔ | |
| 0017 | Research limits | | ✔ | Scheduled refresh: DESIGNED |
| 0018 | Media rights, AI images | Manual check | Build check | |
| 0019 | Claude Design handover | Manual token export | `/design-sync`, contrast check | |
| 0020 | Consent banner by Region | **Decision needed** (issue 19) | Region-driven | GB/US: M2 |
| 0021 | Opt-ins on forms | Email opt-in | | SMS/WhatsApp/double opt-in: DESIGNED |
| 0022 | Tracking rules and tests | ✔ | | |
| 0023 | CTA types and resolution | Types used, written directly | Resolution | Business-hours rule: M2 · `purchase`: DESIGNED |
| 0024 | Knowledge base layout | | ✔ | |
| 0025 | Fact references | | ✔, plus manual expiry command | Scheduled rebuild: M2 |
| 0026 | Listings | | `sameAs` Facts | Local audit: M2 · APIs: DESIGNED |
| 0027 | SEO structure, Redirect Map | Hand-built pages; `_redirects` if needed | Content minimums, enforced Redirect Map | Location pages: M2 |
| 0028 | Turnstile grouping | ✔ | | |
| 0029 | Lead Log location outside the EU | ✔ | | |
| 0030 | Region Overlays, Regulated Packs | | If the first paying Client is regulated | Otherwise M2 |
| 0031 | Dental pack | | If the first paying Client is dental | Otherwise M2 |
| 0032 | Home services pack | | If the first paying Client is home services | Otherwise M2 · number swapping: DESIGNED |
| 0033 | Professional/B2B pack | Informal | Formal pack | |
| 0034 | Site definition outline | Minimal subset | Full outline | |
| 0035 | Versions, approvals | Git plus rollback | `changes.yaml`, Client approvals | Screenshot comparison: M2 |
| 0036 | Module 2 contracts | Idempotent lead ID | Combined file | Split files, webhook: DESIGNED |
| 0037 | Pipeline skills | Daily test submission | Skills, each after a manual run | |
| 0038 | Manual vs automated | Mostly manual | ✔ | Scheduled rebuild, screenshots: M2 |
| 0039 | Milestones | ✔ | | |
