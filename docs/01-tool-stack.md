# 01 — Phase 0 Tool Stack

Phase 0 rents every capability. Nothing is coded. Each slot below is filled by the best free or
near-free tool for an agency running the stack for many small client businesses, and every tool
is chosen so it can be replaced one slot at a time in Phase 1 (see [06-transition-plan.md](06-transition-plan.md)).

All prices and free-tier limits are as researched in September 2026 and marked **verify at
execution**. Vendors change free tiers often; re-check the vendor pricing page before quoting a client.

## Stack at a glance

| Slot | Tool | Per client or agency | Phase 0 cost |
|---|---|---|---|
| DNS, SSL, redirects | Cloudflare (Free) | Agency account, one zone per client | $0 |
| Domain registration | Cloudflare Registrar (gTLDs) or Namecheap (`.in`, other ccTLDs) | Client-owned | ~$10-15/yr |
| Business mailbox | Zoho Mail (Free) or Google Workspace | Client-owned | $0-7/user/mo |
| Website | Webflow site plan (Premium/CMS, or Basic if no blog) | Client-owned site, agency workspace | $15-23/mo |
| SEO | Google Search Console, Bing Webmaster, Google Business Profile, Ahrefs Webmaster Tools, Keyword Planner, Screaming Frog (free) | Client-owned properties, agency tools | $0 |
| Tag management | Google Tag Manager | Client-owned container | $0 |
| Analytics | GA4 + Microsoft Clarity | Client-owned | $0 |
| Consent | CookieYes (Free) with GTM Consent Mode v2 | Client-owned | $0 |
| CRM | HubSpot Free CRM | Client-owned portal | $0 |
| Email + automation | Brevo (Free, then Starter) | Client-owned account | $0-9/mo |
| WhatsApp | Meta WhatsApp Cloud API via Make, or an Indian BSP (AiSensy / Interakt / Wati) | Client-owned Meta Business | Per conversation, BSP $0-20/mo |
| Glue | Make | Agency Core account, one folder per client, two scenarios per client | ~$16/mo agency-wide up to ~8 clients |
| Scheduling | Cal.com (Free) for clients wanting reminders, else HubSpot Meetings (Free) | Client-owned | $0 |
| Reporting | Looker Studio | Agency template, client copy | $0 |
| Internal alerts | Slack (Free) or WhatsApp to owner | Client-owned | $0 |
| Credentials | Bitwarden or 1Password shared vault | Agency | $0-8/mo |

**Per-client floor: about $23-25/mo** (Webflow CMS plan plus domain). **Realistic steady state:
$25-50/mo** once a client outgrows a free tier or uses WhatsApp at volume. Agency-level shared
costs: Make Core (~$16/mo), Ahrefs Lite or Semrush (~$100-130/mo, only once 5+ clients justify it),
password manager.

## Tool-by-tool

### Cloudflare (DNS, SSL, redirects, registrar)

- **Why**: free authoritative DNS, free SSL, redirect rules, Email Routing for inbound forwarding, one agency account with a zone per client, API for every record. At-cost domain pricing on supported TLDs.
- **Pros**: fastest DNS propagation, page rules for UTM short links (see [04-automation-workflows.md](04-automation-workflows.md), W2), Turnstile and WAF available later for Phase 1 sites.
- **Limits**: Cloudflare Registrar does **not** sell `.in` and several other ccTLDs. Buy those at Namecheap or GoDaddy and point nameservers to Cloudflare. Email Routing only forwards inbound mail; sending from `name@client.com` needs a real mailbox (Zoho Mail free tier or Google Workspace). Proxying (orange cloud) must be **off** for the Webflow record, or Webflow SSL breaks.
- **Integrates with**: Webflow (CNAME/A records), Brevo (SPF, DKIM, DMARC TXT records), mailbox MX records.

### Webflow (website)

- **Why**: visual builder the client can edit, clean semantic HTML, native per-page SEO fields, automatic sitemap, 301 redirect manager, CDN hosting, native forms with a redirect URL and built-in reCAPTCHA, CMS API and HTML/CSV export for later migration, template cloning inside an agency workspace.
- **Pros**: no hosting or updates to manage, Lighthouse 90+ achievable, agency workspace lets you build from one master template per vertical and hand off site ownership to the client.
- **Limits**: no server logic, so no Turnstile and no server-side form validation. Plan matters: Basic (~$15/mo annual, verify) has no CMS collections, so any client with a blog needs the Premium/CMS plan (~$23/mo annual, ~2,000 CMS items). Form submission limits differ by plan and changed in May 2026, verify. Price is per site, so design changes are repeated per client.
- **Integrates with**: Make (Webflow's site-level form webhook posts to the router's custom webhook), GTM (custom code in head/body), Cloudflare DNS.
- **Rejected alternatives**: Framer (cheaper, better animation, weaker CMS and 301 control); WordPress (hosting, updates and security become the agency's problem on day one, which contradicts fast execution).

### SEO toolset (all free)

| Tool | Role | Notes |
|---|---|---|
| Google Search Console | Only source of truth for impressions, clicks, indexing, Core Web Vitals | Client-owned property, agency as owner-level user |
| Bing Webmaster Tools | Bing/DuckDuckGo indexing | Import from Search Console in one click |
| Google Business Profile | Local pack, maps, reviews | Critical for Indian local businesses |
| Ahrefs Webmaster Tools | Free site audit and backlink view for verified sites | Agency account, verify each client site |
| Google Keyword Planner | Keyword volume | Needs a Google Ads account, no spend required |
| Screaming Frog (free, 500 URLs) | Pre-launch technical crawl | Agency laptop tool |

- **Limits**: no rank tracking, no competitor keyword data, no content gap analysis on free tiers. Ahrefs Lite or Semrush is an agency-level cost, shared across clients, justified once 5 or more clients are live.
- **Integrates with**: Search Console links to GA4; Webflow generates the sitemap Search Console reads.

### Google Tag Manager

- **Why**: one script in Webflow, every tag change happens in GTM without touching the site. Container export lets the agency keep a master template and import per client.
- **Pros**: preview mode for QA, versioning, Consent Mode v2 built in, GA4 and Clarity tags are first-party templates.
- **Limits**: client-side only. Ad blockers drop 20-40% of hits. Server-side GTM requires paid hosting and is a Phase 1 item.
- **Integrates with**: Webflow custom code, GA4, Clarity, HubSpot tracking, CookieYes, Make webhooks.

### GA4 + Microsoft Clarity (analytics)

- **Why**: GA4 is what clients expect, links to Search Console and Google Ads, exports free to BigQuery. Clarity gives unlimited free heatmaps and session recordings.
- **Pros**: `generate_lead` key event with campaign attribution, Looker Studio connector, BigQuery export as the Phase 1 backfill source.
- **Limits**: 24-48 h data lag, thresholding hides small segments, no user-level export outside BigQuery, GA4 `client_id` never matches HubSpot's cookie so cross-tool attribution is approximate.
- **Integrates with**: GTM, Search Console, Looker Studio.

### CookieYes (consent)

- **Why**: EU visitors require GDPR consent and India's DPDP Act 2023 requires notice and consent for personal data. CookieYes free covers one domain and emits GTM Consent Mode v2 signals.
- **Limits**: free tier has page and pageview caps, verify. WhatsApp messaging needs its own explicit opt-in checkbox on every form regardless of the cookie banner.
- **Integrates with**: GTM Consent Mode v2.

### HubSpot Free CRM

- **Why**: the strongest free CRM for a small business: contacts, companies, one deal pipeline, tasks, meetings scheduler, live chat, tracking code, native Webflow and GTM apps, a good API, and clients already recognise it.
- **Pros**: sales team gets a real pipeline and mobile app on day one, meeting links book straight onto contacts, native Brevo sync exists.
- **Limits (2026 free tier, verify)**: **1,000 contacts**, **2 users**, **10 custom properties**, **2,000 marketing emails/month**, 1 pipeline, **no multi-step workflows** (only a single form follow-up email), HubSpot branding on forms, emails, meeting pages and chat. The 10-property cap is a hard design constraint: see the property budget in [appendix-b-tracking-spec.md](appendix-b-tracking-spec.md). The 1,000-contact cap means clients above that need Starter (~$15-20/seat/mo) or the Phase 1 CRM.
- **Integrates with**: Make (contact, deal, task modules; polling triggers), GTM (tracking code), Brevo (native sync).
- **Rejected alternative**: single-vendor HubSpot for everything. Weakest migration path and forces paid tiers early.

### Brevo (email marketing, automation, transactional)

- **Why**: automation workflows on the free tier, transactional SMTP and API, event webhooks Make can consume, cheaper per contact than Mailchimp (Mailchimp free has no automations).
- **Pros**: 300 emails/day free, automation for up to 2,000 contacts free (verify), Starter (~$9/mo) removes branding and the daily cap, sender domain authentication is standard.
- **Limits**: 300 emails/day free and unused sends do not roll over, so the full nurture sequence hits the cap at roughly 50 new leads/day per client. Brevo branding on free. **WhatsApp campaigns are only on Professional and Enterprise plans**, so WhatsApp is not done through Brevo in Phase 0.
- **Integrates with**: Make (contact upsert, list add, transactional send, webhooks for open/click), HubSpot native sync, Cloudflare (SPF/DKIM/DMARC).

### WhatsApp (Meta Cloud API via Make, or an Indian BSP)

- **Why**: for Indian clients WhatsApp is the primary follow-up channel. Meta's WhatsApp Cloud API has no platform fee and Make has a native "WhatsApp Business Cloud" module, so acknowledgement and reminder templates can be sent from the same scenario that writes the lead to HubSpot.
- **Pros**: no BSP subscription, pay only per conversation, templates approved in Meta Business Manager.
- **Limits**: each client needs a Meta Business Manager, business verification (1-3 weeks), a phone number not already on the WhatsApp app, and pre-approved templates. Two-way inbox and broadcast campaigns are not comfortable through Make; when a client needs those, add an Indian BSP (AiSensy, Interakt, Wati, roughly $15-20/mo) which sits on the same Cloud API.
- **Integrates with**: Make, Meta Business Manager.

### Make (glue)

- **Why**: cheaper per operation than Zapier, real routers and error handlers, native modules for Webflow, HubSpot, Brevo, Google Sheets, Slack and WhatsApp Cloud.
- **Pros**: scenario blueprints export as JSON, so one master scenario is imported per client. Instant webhooks for Webflow forms and GTM events.
- **Limits (2026, verify)**: free plan is 1,000 credits/month and **only 2 active scenarios**, with a 15-minute minimum schedule. Core is ~$12/mo annual or ~$16/mo monthly for 10,000 credits, unlimited scenarios and 1-minute scheduling. Recommended pattern: **one agency Core account, one folder per client, one router scenario plus one `stage-sync` scenario per client** (exactly the free plan's two scenarios if a client insists on their own account). Budget: about 10 credits per lead plus about 400 credits per client per month for `stage-sync` polling, so Core covers about 8 clients and 600 leads per month. Error handling is hand-built per scenario. Any vendor API change can break a step silently, hence the leads Sheet log.
- **Integrates with**: everything.
- **Rejected alternative**: Zapier (2-4x cost at the same volume). n8n self-hosted is the Phase 1 candidate when Make credits become a meaningful cost.

### Cal.com or HubSpot Meetings (scheduling)

- **Why**: Cal.com free has a native webhook, so a booking reaches the Make router instantly and meeting reminders (W6) fire on time. HubSpot Meetings books straight onto the contact record but is only picked up by the 2-hour stage-sync poll.
- **Limits**: HubSpot branding on free; Cal.com needs the router to create the HubSpot meeting engagement.

### Looker Studio (reporting)

- **Why**: free, native GA4 and Search Console connectors, one agency template copied per client.
- **Limits**: the HubSpot connector is a paid third-party connector, so lead and pipeline data reaches Looker via the Google Sheet that Make writes. Templates are copied by hand per client; no cross-client roll-up without a merged Sheet.

### Slack (internal alerts)

- **Why**: owner sees a new lead inside a minute. Free plan is enough for one channel per client. WhatsApp to the owner via the Cloud API is the alternative for owners who do not use Slack.

### Bitwarden or 1Password (credentials)

- **Why**: 20 clients times 8 tools is 160 logins. A shared vault with one collection per client is the only sane way to run this. Every account is created under the client's email, so the vault also holds the ownership matrix from [appendix-a-naming-and-utm.md](appendix-a-naming-and-utm.md).

## Account ownership rule

Every account that holds client data is created under the **client's** email and billing: Webflow site, GA4 property, Search Console, GTM container, HubSpot portal, Brevo account, Meta Business Manager, CookieYes. The agency is added as admin or partner. The agency owns only the Cloudflare account (zones can be moved), the Make account (scenarios export as blueprints) and the Looker Studio templates.

Offboarding hand-over is therefore: Make blueprint JSON, the leads Google Sheet, the GTM container export, the Cloudflare zone re-created in the client's own Cloudflare account, and removal of agency users from every client-owned tool.

## Monthly export routine

Once a month, per client, the agency exports and stores in its own Drive: HubSpot contacts and deals CSV, Brevo contacts and campaign statistics, Webflow CMS CSV, the leads Sheet copy, and a GA4 BigQuery export if enabled. This is both insurance against vendor lock-in and the raw material for the Phase 1 backfill described in [06-transition-plan.md](06-transition-plan.md).

## Sources used for 2026 limits (verify at execution)

- Webflow plans: https://www.lilbigthings.com/post/webflow-site-plans-explained-complete-2026-guide
- HubSpot free limits: https://vedain.com/blog/7-hubspot-free-plan-limitations-2026-hidden-caps and https://www.usecarly.com/blog/hubspot-free-plan-limits/
- Brevo plans: https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans
- Make plans: https://www.usecarly.com/blog/make-com-pricing/
- Cloudflare Registrar TLDs: https://developers.cloudflare.com/registrar/top-level-domains/
