# 06 — Transition Plan to the Custom Platform

Phase 1 replaces rented tools one slot at a time, in an order chosen so each module pays for
itself before the next one starts. The architecture is stack-independent; the framework decision
is deferred until the triggers below fire.

## When to start

Start Phase 1 planning when **any two** of these are true, and only after the Phase 0 validation
gate in [02-architecture.md](02-architecture.md) has passed:

| Trigger | Threshold | Why it matters |
|---|---|---|
| Active clients | ≥ 10-15 | Ops effort and drift now cost more than building |
| Make + HubSpot upgrade cost | > ~$40/client/mo | Rented glue costs more than owning it |
| Cross-client reporting demand | Agency needs it weekly | Cannot be bought on free tiers |
| Client feature asks the tools cannot meet | ≥ 3 clients asking (logic forms, scoring, portal) | Revenue is being turned away |
| Engineering capacity | 1 engineer for ≥ 3 months | Anything less produces a half-built module that is worse than Make |

## Build order

```
1. Lead Hub API + tracking SDK   ← the seam; replaces Make routing, owns identity and events
2. Agency Console                ← cross-client view; reads Lead Hub only
3. Automation engine             ← replaces Brevo workflows + Make; delivery stays rented
4. SEO management system         ← Search Console API, audits, briefs; agency-wide value
5. Lead management / CRM         ← replaces HubSpot after 1-3 exist
6. Site template system          ← Next: block-based template + headless CMS; visual builder last, if ever
```

### 1. Lead Hub API + tracking SDK (first, 4-6 weeks)

**Owns**: the lead capture endpoint, event ingestion, identity resolution (email, phone, anonymous id, GA client id), UTM attribution (first and last touch, full detail), consent ledger, multi-tenant `client_id`, fan-out to vendors through adapters.

**Why first**: it is the seam designed in Phase 0. The only change on the client site is the form target (or Make's destination). It replaces the Make router, which is the most fragile and most expensive piece per lead, and it gives every later module one place to read from. It is also the smallest surface with the highest leverage.

**Interfaces it exposes**:

- `POST /v1/leads` (form payload, same fields as appendix B), idempotent on email or phone within a tenant.
- `POST /v1/events` (tracking SDK batch: page views, clicks, form starts, with anonymous id and consent state).
- `POST /v1/webhooks/{vendor}` (Brevo events, HubSpot stage changes, WhatsApp status).
- `GET /v1/leads`, `GET /v1/contacts/{id}/timeline` for the Console.

**Adapters it ships with** (Phase 0 tools become the first implementations):

| Interface | Phase 0 implementation | Later |
|---|---|---|
| `CrmAdapter` | HubSpot Free | own CRM (module 5) |
| `EmailProvider` | Brevo transactional | Brevo, SES, Resend |
| `MessagingProvider` | WhatsApp Cloud API | BSP (AiSensy, Interakt) |
| `AnalyticsSink` | GA4 Measurement Protocol (server-side `generate_lead`) | own event store |
| `AlertSink` | Slack webhook | Console notifications |
| `SiteProvider` | Webflow (forms, CMS read) | site template system (module 6) |

**Tracking SDK**: a small script replacing the persistence snippet and the GTM intent webhook. It keeps GTM and GA4 in place (clients expect them) but sends first-party events to Lead Hub as well, which solves the ad-blocker and Safari ITP losses in F14.

**Done when**: three pilot clients run with Make disabled for W1 and W4, the Sheet is written by Lead Hub, and reconciliation against Make's history matches for 14 days.

### 2. Agency Console (3-4 weeks)

**Owns**: cross-client leads, sources, campaigns, pipeline snapshot, alerts, per-client configuration (which adapters, which templates, which consent rules), blueprint versions.

**Why second**: it is the first thing the agency and clients see value from, and it needs nothing but Lead Hub reads. It removes F2, F16 and F18, and because it reports on Lead Hub's own events it also removes the GA4 lag and thresholding problem (F15) for lead reporting.

**Done when**: the monthly client review is run from the Console instead of Looker, and Looker templates are archived.

### 3. Automation engine (6-8 weeks)

**Owns**: trigger → condition → action workflows, timed sequences, scoring rules with decay, quiet hours, consent gates, WhatsApp and email steps, per-client templates. Runs on a durable job queue.

**Why third**: it replaces Brevo workflows and the rest of Make, fixing F5, F6, F7, F10. Delivery stays rented: Brevo, SES or Resend behind `EmailProvider`, WhatsApp Cloud behind `MessagingProvider`. Building delivery infrastructure is never worth it at this scale.

**Done when**: W1 to W6 from doc 04 run in the engine for all clients, Brevo automations are switched off, and Brevo is used only as a sending API.

### 4. SEO management system (4-6 weeks)

**Owns**: Search Console API ingestion (daily, per property, full row depth), position history, page-level SEO checklist tied to site pages, technical audit crawler (own crawler or a Screaming Frog CLI wrapper), content brief generator, Google Business Profile insights.

**Why fourth**: high agency-wide value, cheap to build on free APIs, independent of the CRM. It removes the Search Console UI limits and the manual monthly SEO report.

**Done when**: every client has an automated weekly SEO report and a ranked list of pages to fix.

### 5. Lead management / CRM (6-8 weeks)

**Owns**: contacts, companies, pipeline with configurable stages, tasks, notes, timeline fed by Lead Hub events, mobile-friendly UI for the client's sales person.

**Why fifth**: HubSpot Free is good enough until the contact cap (F3) or the property cap (F4) bites, and both are avoided by Lead Hub holding the detail. Build it only when several clients are paying HubSpot Starter, because that is money the platform can capture.

**Done when**: a client can be onboarded without a HubSpot portal and the sales person prefers the new UI in a side-by-side week.

### 6. Site template system (last)

A drag-and-drop builder is the highest-effort, lowest-differentiation module, and Webflow already does it well, so the order is template first, editor last.

- **6a**: a block-based site template (server-rendered or static output) with a headless CMS, deployed per client, with the tracking SDK and Lead Hub forms built in. This fixes F12, F13 and F19 for the majority of clients whose sites are a home page, service pages, a blog and a contact form.
- **6b**: a visual editor over those blocks, only if there are 30+ clients and the design team asks for it. Webflow stays available for design-heavy clients behind `SiteProvider`.

## What stays integrated permanently

| Capability | Keep renting | Reason |
|---|---|---|
| Email delivery | Brevo, SES, Resend | Deliverability, IP reputation, compliance are a full-time job |
| WhatsApp infrastructure | Meta Cloud API, a BSP for inbox | Meta controls it; nothing to build |
| GA4 and Search Console | Google | Clients expect them; Google's data is not reproducible |
| DNS, SSL, edge | Cloudflare | Commodity; API covers automation |
| Consent banner | CookieYes or equivalent | Legal text and geo rules change constantly |
| Session recordings | Clarity | Free and good |
| Payments | Razorpay, Stripe | Regulated |
| Password management | Bitwarden | Security |

## Migration procedure, per module, per client

1. **Backfill**: import from the monthly exports plus the vendor API (HubSpot contacts, deals, timeline; Brevo contacts and engagement; the leads Sheet) into Lead Hub, keeping the vendor id as `external_id`.
2. **Dual-write**: Lead Hub writes to both the old vendor and the new module for 2 weeks.
3. **Reconcile**: a daily job compares counts and a sample of records; discrepancies are listed in the Console.
4. **Cut over**: flip the adapter for that client in Console config.
5. **Cool-down**: keep the vendor read-only for 30 days, then close the account and update the ownership matrix.

### Field mapping, HubSpot → Lead Hub (first module)

| HubSpot | Lead Hub |
|---|---|
| contact `email`, `phone`, `firstname`, `lastname` | `contact.email`, `contact.phone_e164`, `contact.first_name`, `contact.last_name` |
| `utm_*_first`, `utm_*_last`, `landing_page` | `attribution.first.*`, `attribution.last.*` (full detail restored from the Sheet and Brevo) |
| `lead_score` | `contact.score` with history |
| `form_type_last` | latest `lead.form_type` |
| `consent_whatsapp`, Brevo `CONSENT_MARKETING` | `consent` ledger rows with source, timestamp, channel |
| deal `dealstage`, `amount`, `lost_reason` | `deal.stage`, `deal.amount`, `deal.lost_reason` |
| contact id, deal id | `external_ids.hubspot_contact`, `external_ids.hubspot_deal` |
| timeline (emails, meetings, notes) | `events` with `source = hubspot` |

## Stack selection criteria (decision deferred)

The design above does not depend on a framework. When a trigger fires and an engineer is assigned,
the stack must satisfy these, and the choice is recorded in an ADR in this folder:

| Requirement | Why it matters here | Rules in / out |
|---|---|---|
| Server-rendered or static page output for module 6 | Client pages must be crawlable | SSR/SSG frameworks; no pure single-page app |
| Relational store with row-level tenant isolation | Many clients, strict separation, small team | Postgres-class database with `tenant_id` and row-level security; a columnar store only once events pass tens of millions of rows |
| Durable job queue with delays and retries | Automation timers, vendor fan-out, backfills | Any persistent queue; cron alone is not enough |
| Typed HTTP API with webhook ingestion and idempotency | Lead Hub is the seam every site and vendor posts to | Any mature web framework with schema validation |
| Team familiarity | Velocity, reuse of existing review rules and tooling | Whatever the assigned engineers already ship to production |

Context, not a decision: the agency already operates a NestJS + Next.js + Postgres codebase, so
that stack is the default candidate on the familiarity criterion.

## Sequencing and effort summary

| Module | Effort (1 engineer) | Replaces | Fixes |
|---|---|---|---|
| 1 Lead Hub + SDK | 4-6 weeks | Make router, snippet | F1, F4, F8, F9, F11, F14, F17, F19 |
| 2 Agency Console | 3-4 weeks | Looker templates, master sheet | F2, F15, F16, F18 |
| 3 Automation engine | 6-8 weeks | Brevo workflows, remaining Make | F5, F6, F7, F10 |
| 4 SEO system | 4-6 weeks | Manual SEO reporting | Search data depth |
| 5 CRM | 6-8 weeks | HubSpot | F3, F20 partly |
| 6a Site template | 6-8 weeks | Webflow for standard sites | F12, F13 |

Total to a fully owned core (modules 1-5): roughly 6-8 months for one engineer, with each module
live and paying for itself before the next starts.
