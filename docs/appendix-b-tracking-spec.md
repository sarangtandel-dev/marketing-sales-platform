# Appendix B — Tracking Spec

This is the contract between the Webflow site, GTM, GA4, Make and HubSpot. It is the same for every
client; only the container id, measurement id and Make webhook URLs change. Everything here runs in
the browser. Phase 0 has no backend.

## 1. dataLayer events

GTM listens for these `dataLayer.push` calls. Webflow custom code and GTM built-in triggers emit them.

| Event | When it fires | Parameters | Emitted by |
|---|---|---|---|
| `page_view` | every page load, after consent | GA4 default | GA4 config tag |
| `cta_click` | click on any element with `data-track="cta"` | `cta_id` (from `data-cta-id`), `page_path` | GTM click trigger |
| `phone_click` | click on `a[href^="tel:"]` | `phone`, `page_path`, `known_contact` (bool) | GTM click trigger |
| `whatsapp_click` | click on `a[href*="wa.me"]` or `data-track="whatsapp"` | `page_path`, `known_contact` (bool) | GTM click trigger |
| `form_start` | first focus inside a Webflow form | `form_id`, `form_type` | GTM element visibility + focus trigger |
| `form_submit` | Webflow form submit succeeded (client-side) | `form_id`, `form_type` | GTM form submission trigger, "wait for tags" on |
| `generate_lead` | `/thank-you` page view | `form_type` (from `?type=` query param), `value` (optional, per client), `currency` | GTM page view trigger on path `/thank-you` |
| `scroll_75` | 75% scroll depth | `page_path` | GTM scroll trigger |
| `outbound_click` | click to another domain | `link_url` | GTM click trigger |

`form_type` is one of `contact`, `quote`, `booking`, `newsletter`. Each Webflow form has a hidden field `form_type` and redirects to `/thank-you?type=<form_type>`.

## 2. GA4 configuration

- Key events (conversions): `generate_lead` only. `form_submit` is kept as a diagnostic event, not a key event, so double counting never happens.
- Custom dimensions (event-scoped): `form_type`, `cta_id`, `known_contact`.
- Enhanced measurement: on, but disable "form interactions" so GTM's events are the only form events.
- Search Console linked. Google Signals off by default (consent risk), enable per client if they run Ads remarketing.
- Data retention: 14 months.
- Internal traffic filter: agency office IPs.

## 3. Consent Mode v2

CookieYes sets default `denied` for `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`. GA4 and Clarity tags fire only after `analytics_storage = granted`. HubSpot tracking code fires only after `ad_storage = granted`. Make webhooks for `whatsapp_click`/`phone_click` fire regardless because they carry no cookie, only data the visitor already gave on a form.

## 4. Hidden form fields

Every lead form in Webflow contains these hidden inputs. The persistence snippet fills them on page load and again on `form_start`.

| Field name | Source | Example |
|---|---|---|
| `form_type` | static per form | `quote` |
| `utm_source_first` | localStorage | `google` |
| `utm_medium_first` | localStorage | `cpc` |
| `utm_campaign_first` | localStorage | `202609-quote-monsoon-offer` |
| `utm_content_first` | localStorage | `carousel-a` |
| `utm_term_first` | localStorage | `plumber near me` |
| `utm_source_last` | sessionStorage | `brevo` |
| `utm_medium_last` | sessionStorage | `email` |
| `utm_campaign_last` | sessionStorage | `nurture-3` |
| `utm_content_last` | sessionStorage | `footer-link` |
| `utm_term_last` | sessionStorage | |
| `gclid` | localStorage | `Cj0KCQ...` |
| `fbclid` | localStorage | |
| `landing_page` | localStorage, first page of first session | `/services/plumbing` |
| `referrer` | localStorage, `document.referrer` at first visit | `https://www.google.com/` |
| `ga_client_id` | `_ga` cookie | `1234567890.1694000000` |
| `page_url` | `location.href` at submit | |
| `first_seen_at` | localStorage, ISO timestamp | `2026-09-17T10:15:00Z` |
| `hp_company` | honeypot, must stay empty | |

Visible fields required on every lead form: `name`, `email` or `phone` (client decides which is required), `consent_marketing` checkbox (unchecked by default), `consent_whatsapp` checkbox (unchecked by default, only if the client uses WhatsApp).

## 5. Persistence snippet contract

Placed in Webflow site-wide custom code, before `</body>`. Behaviour it must implement:

1. Parse `location.search` for `utm_*`, `gclid`, `fbclid`.
2. If localStorage has no `mt_first` object, write `{utm_*, gclid, fbclid, landing_page, referrer, first_seen_at}` from the current URL, `document.referrer` and the clock. If the URL has no UTMs, still write landing page, referrer and timestamp so first-touch is `(direct)` rather than empty.
3. If the current URL has any `utm_*`, overwrite sessionStorage `mt_last` with them.
4. Read GA4 `client_id` from the `_ga` cookie (`GA1.1.<client_id>` format, strip the first two segments). Retry once after 1 s if the cookie is not yet set.
5. On DOMContentLoaded and on every `focusin` inside a form, fill every hidden input whose `name` matches a key above.
6. On the form `submit` event, before Webflow navigates away, read the `email` and `phone` inputs and store `mt_contact = {email, phone}` in localStorage. The redirect to `/thank-you` carries only `?type=`, so this is the last moment the values are available. Later `whatsapp_click`/`phone_click` events read `mt_contact` to carry `known_contact = true` and the identifier.
7. Never throw. Wrap storage access in try/catch; private mode and blocked storage must not break forms.

The reference implementation lives in the agency Webflow master template. Any change is versioned by date in the snippet's first comment line.

## 6. GTM → Make intent webhook

Trigger: `whatsapp_click` or `phone_click` where `known_contact = true`.
Tag: custom image or `fetch` tag posting JSON to the client's Make webhook:

```json
{
  "event": "whatsapp_click",
  "email": "<from mt_contact>",
  "phone": "<from mt_contact>",
  "page_path": "/pricing",
  "ts": "2026-09-17T10:20:00Z"
}
```

Make increments the HubSpot `lead_score` property per [04-automation-workflows.md](04-automation-workflows.md), W4.

## 7. HubSpot custom property budget (10 max on free)

HubSpot Free allows 10 custom properties. This is the full allocation. Nothing else may be added without removing something.

| # | Property | Type | Filled by |
|---|---|---|---|
| 1 | `utm_source_first` | text | Make, only if empty |
| 2 | `utm_medium_first` | text | Make, only if empty |
| 3 | `utm_campaign_first` | text | Make, only if empty |
| 4 | `utm_source_last` | text | Make, always |
| 5 | `utm_medium_last` | text | Make, always |
| 6 | `utm_campaign_last` | text | Make, always |
| 7 | `landing_page` | text | Make, only if empty |
| 8 | `lead_score` | number | Make, W4 |
| 9 | `form_type_last` | dropdown | Make, always |
| 10 | `consent_whatsapp` | boolean | Make, always |

Everything else (`utm_content`, `utm_term`, `gclid`, `fbclid`, `ga_client_id`, `referrer`, `page_url`, `first_seen_at`, `lead_source_detail`) lives in the leads Sheet and in Brevo attributes, where there is no such cap. HubSpot's built-in `Original source` properties remain as a secondary view.

## 8. Brevo attributes

Create once per account: `FIRSTNAME`, `LASTNAME`, `SMS` (E.164 phone), `FORM_TYPE`, `UTM_SOURCE_FIRST`, `UTM_MEDIUM_FIRST`, `UTM_CAMPAIGN_FIRST`, `UTM_CONTENT_FIRST`, `UTM_TERM_FIRST`, `UTM_SOURCE_LAST`, `UTM_MEDIUM_LAST`, `UTM_CAMPAIGN_LAST`, `UTM_CONTENT_LAST`, `UTM_TERM_LAST`, `GCLID`, `FBCLID`, `LANDING_PAGE`, `REFERRER`, `PAGE_URL`, `FIRST_SEEN_AT` (date), `GA_CLIENT_ID`, `LEAD_SOURCE_DETAIL`, `CONSENT_MARKETING` (bool), `CONSENT_WHATSAPP` (bool), `DEAL_STAGE` (text, synced from HubSpot), `MEETING_AT` (date, synced), `MEETING_OUTCOME` (text, synced), `HUBSPOT_ID` (text), `LEAD_SCORE` (number).

## 9. Leads Sheet columns (`leads` tab)

`ts`, `run_id`, `form_type`, `name`, `email`, `phone`, `message`, all hidden fields from section 4 in the same order, `lead_source_detail`, `consent_marketing`, `consent_whatsapp`, `hubspot_contact_id`, `hubspot_deal_id`, `brevo_contact_id`, `whatsapp_sent` (bool), `alert_sent` (bool), `lead_score` (updated by W4), `deal_stage` and `amount` (updated by stage-sync), `lost_reason`, `unsubscribed_at` (written by the router on Brevo's unsubscribe webhook).

The `failed` tab has the same columns plus `error_step` and `error_message`.

## 10. QA checklist for the tracking layer

- GTM preview shows every event in section 1 on a test walkthrough.
- GA4 DebugView shows `generate_lead` with `form_type` exactly once per test submission.
- A test submission from a URL with UTMs arrives in Webflow with all hidden fields populated.
- A second test submission from a plain URL in the same browser keeps first-touch values and shows `(direct)` last-touch.
- Clarity shows the recording.
- Consent declined: GA4 and Clarity requests absent in the network tab, form still submits.
