# 05 — Limitations of the Cloud Approach

Phase 0 is built to be replaced. This document says exactly where it breaks, what cannot be
controlled, and at what numbers the cost or effort stops making sense. Every row maps to a
module in the Phase 1 build order in [06-transition-plan.md](06-transition-plan.md).

## Where it fails

| # | Failure | Concrete threshold | Symptom | Phase 1 module that fixes it |
|---|---|---|---|---|
| F1 | No unified visitor → lead → deal journey. GA4 `client_id`, HubSpot cookie and Brevo contact never fully reconcile. | From day one | Client asks "which campaign brought the deal we won?" and gets two different answers | Lead Hub (event store + identity) |
| F2 | No cross-client view. Every dashboard, pipeline and automation lives in its own portal. | Painful at 5 clients, unmanageable at 15 | Agency spends hours per week copying numbers into a master sheet | Agency Console |
| F3 | HubSpot Free contact cap (1,000, verify) | Any client above 1,000 contacts | Forced to Starter (~$15-20/seat/mo) or to delete contacts | Lead management / CRM module |
| F4 | HubSpot Free property cap (10 custom) | From day one | Attribution detail split across three systems (appendix B section 7) | Lead Hub |
| F5 | HubSpot Free has no multi-step workflows | From day one | Everything time-based must live in Brevo or Make | Automation engine |
| F6 | Brevo Free 300 emails/day, no rollover | ~50 new leads/day per client once all W3 steps overlap | Nurture emails silently delayed to the next day | Automation engine + delivery provider stays |
| F7 | Brevo WhatsApp only on Professional | From day one | WhatsApp runs through Make + Cloud API, no inbox, no broadcast | Automation engine + BSP adapter |
| F8 | Make credit cost grows with leads × steps plus a fixed ~400 credits per client per month for polling | About 8 clients and 600 leads/month on Core (10,000 credits) | Next tier, longer polling intervals or dropped workflows | Lead Hub replaces the router and polling |
| F9 | Make Free only 2 active scenarios | Any client demanding their own free Make account | Router + stage-sync only, no replay scenario | Lead Hub |
| F10 | HubSpot stage and meeting changes are polled every 2 hours | From day one | W3 can send one more email after a deal is qualified; meeting reminders cannot be closer than 3 h | Automation engine with real events |
| F11 | Any vendor API change breaks a Make step silently | Random | Leads in the `failed` tab, discovered days later without the Slack alert | Lead Hub with owned contracts and tests |
| F12 | Webflow has no server logic | From day one | No Turnstile, no server validation, no logic forms, no gated content | Site template + Lead Hub forms endpoint |
| F13 | Webflow per-site pricing and per-site design | Every design change × N clients | A header fix takes N × 20 minutes | Site template system |
| F14 | Client-side tracking only | From day one | 20-40% of visitors invisible to GA4 (ad blockers, consent declines); Safari ITP shortens first-touch memory to 7 days | Server-side event ingestion in Lead Hub |
| F15 | GA4 data lag and thresholding | From day one | Yesterday's numbers arrive tomorrow; small segments hidden | Lead Hub reporting on own events |
| F16 | Looker Studio HubSpot connector is paid | From day one | Pipeline data reaches reports via the Sheet with 15-minute lag | Agency Console |
| F17 | Data ownership across 8 vendors, manual export | Monthly routine, grows with clients | 8 × N exports per month | Lead Hub as system of record |
| F18 | No template versioning across sites, containers, blueprints | From 5 clients | Drift: nobody knows which client runs which version | Site template + Console config |
| F19 | No audit trail of who changed what | From day one | A client edits a hidden field name and W1 breaks | Lead Hub schema validation |
| F20 | Vendor price changes hit every client at once | Random | Re-quoting N clients | Reduced surface per vendor |

## What cannot be customised or controlled

- **Lead scoring** beyond additive counters. No decay, no page-view intent, no model.
- **Forms** with conditional logic, multi-step wizards, file uploads with validation, or server-side pricing calculators.
- **Funnels** with server validation, gated downloads, or personalised thank-you pages by segment.
- **Enrichment**: no company lookup, no phone validation, no AI qualification on the lead payload before it hits the CRM.
- **White-label client portal**: the client sees HubSpot, Brevo and Looker branding, never the agency's.
- **Real-time behaviour**: nothing reacts to what the visitor is doing right now; the fastest loop is a 15-minute poll.
- **Consent as data**: consent lives in CookieYes, a checkbox value and a HubSpot boolean, with no single ledger of who consented to what and when.
- **Deliverability tuning**: shared IPs on Brevo free; no dedicated IP, no warm-up control.
- **Search data depth**: Search Console gives 16 months and 1,000 rows per query in the UI; deeper analysis needs the API (Phase 1 SEO module).

## Scalability and cost curve

Per-client tool cost (verify at execution, September 2026):

| Clients | Typical monthly cost per client | Agency shared | Notes |
|---|---|---|---|
| 1-3 (pilot) | $25-35 | Make Core $16 | All free tiers hold |
| 4-10 | $30-50 | Make Core $16, Ahrefs Lite ~$130 | 1-2 clients on Brevo Starter or HubSpot Starter |
| 10-20 | $40-70 | Make Pro ~$30+, Ahrefs ~$130, password manager | Several clients over HubSpot's contact cap; Make credits become the largest agency line. This is the Phase 1 trigger zone (doc 06: 10-15 clients) |
| 20+ | $50-90 | $200-400 | Cost and ops overhead keep rising linearly; Phase 1 module 1 should already be live |

Agency operating effort, observed pattern for this kind of stack: onboarding 2-3 days per client, then 2-4 hours per client per month at 1-10 clients, rising to 5-8 hours at 15+ because of drift, vendor changes and reporting requests. Effort, not tool cost, is what forces Phase 1.

## What Phase 0 keeps doing

Phase 0 gets a client live in 3-4 days for under $50/mo with a real pipeline, attribution and nurture. Phase 1 starts on the triggers in doc 06, and the capabilities vendors do better than an agency (email delivery, DNS, analytics clients recognise, WhatsApp infrastructure) stay rented permanently, per the table in doc 06.
