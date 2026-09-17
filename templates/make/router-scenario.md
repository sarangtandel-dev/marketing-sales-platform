# Make scenario: `<slug> · router`

Build this once in the agency Make account, export it (scenario menu > Export blueprint) as
`router-blueprint.json` next to this file, then import per client and set the client variables.
Blueprint JSON is Make-generated only; never hand-edit it.

**Trigger**: Webhooks > Custom webhook. One URL per client. Data structure: accept anything
(JSON pass-through). This URL is posted to by Webflow (form webhook), Brevo (events), GTM
(intent tag) and Cal.com (bookings).

**Client variables** (Tools > Set multiple variables, first module after the webhook):
`slug`, `owner_email`, `owner_slack_webhook`, `hubspot_pipeline_id`, `hubspot_owner_id`,
`brevo_list_new_leads`, `brevo_list_newsletter`, `sheet_id`, `wa_phone_number_id`,
`wa_template_ack`, `default_country_code` (e.g. `91`), `quiet_hours_wa` (`10-18`), `timezone`.

## Module map

```
[1] Webhook (custom)
[2] Set variables (client config)
[3] Router on event
    ├─ A  event = form_submission  (Webflow payload has "name" and "data" keys; Webflow sends no "event" field, so route on: exists(data) )
    ├─ B  event = brevo_event      (Brevo payload has "event" in opened|clicked|unsubscribed|hard_bounce)
    ├─ C  event = intent_click     (GTM tag)
    └─ D  event = cal_booking      (Cal.com payload has "triggerEvent" = BOOKING_CREATED)
```

### Route A: form submission

| # | Module | Settings |
|---|---|---|
| A1 | Filter | `data.hp_company` is empty (honeypot). Drop otherwise. |
| A2 | Tools > Set variables | `email` = lower(trim(data.email)); `phone` = E.164 from data.phone using default_country_code; `form_type` = data.form_type; `name` = trim(data.name); `is_newsletter` = form_type = newsletter; `lead_source_detail` = form_type + "/" + data.utm_source_last + "/" + data.utm_medium_last; `run_id` = execution id |
| A3 | Google Sheets > Add a row | Sheet `leads`, every column in appendix B section 9; ids empty for now. Store the returned row number as `row`. Error handler: Resume (never let the Sheet block the lead). |
| A4 | Router | branch `not is_newsletter` → A5-A9; branch `is_newsletter` → A10 only |
| A5 | HubSpot CRM > Search for contacts | by `email`; if empty and phone present, search by `phone`. |
| A6 | HubSpot CRM > Create or update a contact | firstname/lastname from name; phone; the 10 custom properties: `utm_*_first` **only if the contact is new** (use the A5 result to decide), `utm_*_last` always, `landing_page` only if new, `form_type_last`, `consent_whatsapp`, `lead_score` = existing + (30 if quote/booking, 20 if contact). Error handler: Break with 3 retries, 1 min apart, then Ignore and continue (Sheet row already exists). |
| A7 | HubSpot CRM > Create a deal | name `<form_type> · <name>`, pipeline `hubspot_pipeline_id`, stage New, associate A6 contact, owner `hubspot_owner_id`. |
| A8 | HubSpot CRM > Create a task | subject `Call <name> (<form_type>)`, due now + 24 h, associated to contact and deal, owner. |
| A9 | Router (parallel fan-out) | see A9a-A9d |
| A9a | Brevo > Create or update a contact | attributes from appendix B section 8 (all UTMs, GCLID, FBCLID, LANDING_PAGE, REFERRER, PAGE_URL, FIRST_SEEN_AT, GA_CLIENT_ID, LEAD_SOURCE_DETAIL, CONSENT_*, FORM_TYPE, HUBSPOT_ID, LEAD_SCORE); add to list `brevo_list_new_leads`. Then Google Sheets > Update a row (`row`): `brevo_contact_id`. |
| A9b | Filter `data.consent_whatsapp = true AND wa_template_ack not empty AND hour(now, timezone) in quiet_hours_wa` → WhatsApp Business Cloud > Send a template message | phone number id `wa_phone_number_id`, template `wa_template_ack`, params name, form_type. Then Sheets > Update `whatsapp_sent = true`. (Leads outside WhatsApp hours: skip; the email acknowledgement still goes.) |
| A9c | Slack > Create a message (or HTTP to `owner_slack_webhook`) | text: `New <form_type> lead: <name> · <phone> · <email> · <lead_source_detail>` + HubSpot contact URL. Then Sheets > Update `alert_sent = true`. |
| A9d | Google Sheets > Update a row (`row`) | `hubspot_contact_id`, `hubspot_deal_id`, `lead_source_detail`. |
| A10 | Brevo > Create or update a contact | add to `brevo_list_newsletter` with double opt-in template; Sheets > Update `brevo_contact_id`. |

### Route B: Brevo event

| # | Module | Settings |
|---|---|---|
| B1 | Router on `event` | |
| B2 | `clicked` / `opened` → HubSpot search contact by email → increment `lead_score` (+5 per click, cap +15; +1 per open, cap +3; keep caps by reading Brevo `LEAD_SCORE_CLICKS` counters or a Sheet lookup) → update HubSpot, Brevo `LEAD_SCORE`, Sheet `lead_score`. If score crosses 40 and deal stage in (New, Contacted): HubSpot create task "Call now, hot lead" due +2 h, Slack alert with 🔥. |
| B3 | `unsubscribed` / `hard_bounce` → Google Sheets > Search rows by email → Update `unsubscribed_at` = now. If the unsubscribe came from a WhatsApp reply: HubSpot update `consent_whatsapp = false`. |

### Route C: intent click (GTM)

| # | Module | Settings |
|---|---|---|
| C1 | Filter | `email` or `phone` present |
| C2 | HubSpot search contact → update `lead_score` +10 → Brevo `LEAD_SCORE`, Sheet `lead_score`. Threshold logic as B2. |

### Route D: Cal.com booking

| # | Module | Settings |
|---|---|---|
| D1 | Parse `payload.attendees[0].email`, `payload.startTime`. |
| D2 | HubSpot search contact → update deal stage to Contacted if New; HubSpot create meeting engagement. |
| D3 | Brevo update contact `MEETING_AT` = startTime (starts the W6 reminders automation). Sheet update `deal_stage`. Slack alert "Meeting booked". |

## Error handling standard

- Every HubSpot and Brevo module: error handler = Break (3 retries, 60 s), then a Google Sheets > Add a row on the `failed` tab with `error_step`, `error_message`, the full payload, and a Slack message to the agency `#make-failures`.
- Sheet modules: error handler = Resume with empty, never Rollback.
- Scenario settings: sequential processing on; max errors before pause 10; data is stored on incomplete executions (so `replay-failed` can re-run).

## Test payloads

Use Webflow's "Send test" on the form webhook, or POST this to the router URL:

```json
{ "name": "Quote form", "site": "x", "data": {
  "name": "Test Lead", "email": "test@example.com", "phone": "9999999999", "message": "Need a quote",
  "form_type": "quote", "utm_source_first": "google", "utm_medium_first": "cpc", "utm_campaign_first": "202609-quote-test",
  "utm_source_last": "google", "utm_medium_last": "cpc", "utm_campaign_last": "202609-quote-test",
  "landing_page": "/services/plumbing", "referrer": "https://www.google.com/", "ga_client_id": "1.2",
  "page_url": "https://client.example/contact", "first_seen_at": "2026-09-17T10:00:00Z",
  "consent_marketing": "true", "consent_whatsapp": "true", "hp_company": "" } }
```

Intent click test:

```json
{ "event": "intent_click", "intent": "whatsapp_click", "email": "test@example.com", "phone": "", "page_path": "/pricing", "ts": "2026-09-17T10:20:00Z" }
```
