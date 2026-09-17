# Appendix A — Naming, UTM Taxonomy, Account Ownership

These conventions are what make 20 clients manageable by one operator. Deviate from them and the
Make blueprints, Looker templates and GTM container imports stop being copy-paste.

## Client slug

- Lowercase, ASCII, hyphen-separated, 3-20 characters, no legal suffixes: `sharma-plumbing`, `acme-dental`.
- The slug is fixed at onboarding and used in every tool name, Sheet name, Make folder and list name.

## Tool naming pattern

`<client-slug>-<tool>-<purpose>`

| Object | Name |
|---|---|
| Cloudflare zone | the bare domain (no rename possible) |
| Webflow site | `<slug>-site` |
| GTM container | `<slug>-web` |
| GA4 property | `<slug> - Website` |
| HubSpot portal name | `<Client legal name>` |
| HubSpot pipeline | `Sales` (single pipeline on free) |
| Brevo lists | `<slug>-new-leads`, `<slug>-nurturing`, `<slug>-customers`, `<slug>-newsletter`, `<slug>-cold` |
| Make folder | `<slug>` |
| Make scenarios | `<slug> · router`, `<slug> · stage-sync`, `<slug> · replay-failed` |
| Google Sheet | `<slug>-leads-log` with tabs `leads`, `failed`, `utm-builder` |
| Slack channel | `#leads-<slug>` |
| Looker Studio report | `<Client name> — Growth Report` |
| Bitwarden collection | `<slug>` |

## UTM taxonomy

All values lowercase, no spaces, hyphens only. The `utm-builder` tab in the client's Sheet generates
URLs from dropdowns so nobody types these by hand.

| Parameter | Rule | Allowed values / format |
|---|---|---|
| `utm_source` | The platform or referrer, one word | `google`, `bing`, `facebook`, `instagram`, `linkedin`, `youtube`, `whatsapp`, `brevo`, `justdial`, `indiamart`, `gbp`, `partner-<name>`, `print`, `event-<name>` |
| `utm_medium` | The channel type, fixed vocabulary | `cpc`, `paid_social`, `social`, `email`, `whatsapp`, `sms`, `referral`, `offline`, `display`, `video` |
| `utm_campaign` | `YYYYMM-<goal>-<name>`; evergreen links (profiles, email signatures, QR on permanent signage) use `evergreen-<placement>` | `202609-quote-monsoon-offer`, `202610-brand-launch`, `evergreen-gbp`, `evergreen-signature` |
| `utm_content` | Creative or placement variant | `carousel-a`, `story-b`, `footer-link`, `qr-shopfront` |
| `utm_term` | Paid keyword only | `{keyword}` from ads |

Goals in `utm_campaign` are one of: `quote`, `booking`, `newsletter`, `brand`, `retarget`, `reactivate`.

Rules:

- Organic search and direct traffic never carry UTMs. GA4 classifies them.
- Email links from Brevo use `utm_source=brevo&utm_medium=email&utm_campaign=<sequence-name>`; Brevo can add these automatically per campaign, configure it once.
- Offline and WhatsApp campaigns use short links: a Cloudflare redirect rule on `go.client.com/<code>` to the full UTM URL. QR codes point at the short link. Bitly free is the alternative if the client has no subdomain to spare.
- GA4 default channel grouping maps `cpc` to Paid Search, `paid_social` (with a social source) to Paid Social, `social` to Organic Social, `email`, `sms`, `referral`, `display` and `video` to their named channels. `whatsapp` and `offline` have no default rule and land in Unassigned, so step 4 of the playbook creates the custom channel group `Agency channels` with a rule for each.

## Deal pipeline stages (HubSpot, one pipeline)

`New` → `Contacted` → `Qualified` → `Proposal` → `Won` / `Lost`

Lost reasons (deal property, one of): `unresponsive`, `price`, `no-need`, `competitor`, `spam`, `other`.

## Lead source detail (Sheet and Brevo attribute `LEAD_SOURCE_DETAIL`)

Format: `<form-type>/<utm_source_last>/<utm_medium_last>` e.g. `quote/google/cpc`, `contact/(direct)/(none)`.

## Account ownership matrix

Fill this in at step 0 of the playbook and store it in the client's Bitwarden collection.

| Tool | Owner (login email) | Agency role | Billing | Hand-over on exit |
|---|---|---|---|---|
| Domain registrar | client | n/a, agency has DNS only | client | nothing, already theirs |
| Cloudflare zone | agency account | owner | free | client creates own Cloudflare account, agency re-adds the zone there and hands over nameserver details |
| Business mailbox | client | none | client | nothing |
| Webflow site | client-owned site in agency workspace | workspace admin | client card on site plan | transfer site to client workspace |
| GTM container | client Google account | admin | free | remove agency user, give container export |
| GA4 property | client Google account | editor | free | remove agency user |
| Search Console | client Google account | owner | free | remove agency user |
| Google Business Profile | client Google account | manager | free | remove agency user |
| CookieYes | client | admin | free | nothing |
| HubSpot portal | client | super admin (1 of 2 seats) | free | remove agency seat |
| Brevo | client | admin | client card if upgraded | remove agency user |
| Meta Business Manager | client | admin | client card | remove agency |
| Make | agency | owner | agency | give blueprint JSON |
| Google Sheet leads log | agency Drive, shared to client | owner | free | transfer ownership |
| Looker Studio | agency, shared | owner | free | client copies report |
| Slack | client workspace, or agency workspace with a shared channel | member | free | leave channel |
| Bitwarden collection | agency | owner | agency | export and delete |
