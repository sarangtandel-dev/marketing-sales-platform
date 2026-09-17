# GTM master container spec

Build this once in the agency's reference container, export it (Admin > Export container), and
store the JSON next to this file as `container-export.json`. Per client: import the JSON into the
client's new container with "Overwrite", then fill the four client variables.

`container-export.json` in this folder is a hand-authored starting export that implements this
spec. Import it, then open every tag once and save, which lets GTM validate and normalise it.

## Variables

| Name | Type | Value | Filled |
|---|---|---|---|
| `c.ga4_measurement_id` | Constant | `G-XXXXXXX` | step 4 |
| `c.clarity_project_id` | Constant | `xxxxxxxxxx` | step 4 |
| `c.hubspot_portal_id` | Constant | `12345678` | step 6 (leave `PENDING` until then) |
| `c.make_webhook_url` | Constant | `https://hook.eu2.make.com/...` | step 6 (leave `PENDING` until then) |
| `dl.form_type` | Data Layer Variable | `form_type` | auto |
| `dl.cta_id` | Data Layer Variable | `cta_id` | auto |
| `dl.known_contact` | Data Layer Variable | `known_contact` | auto |
| `dl.page_path` | Data Layer Variable | `page_path` | auto |
| `dl.contact_email` | Data Layer Variable | `contact_email` | auto |
| `dl.contact_phone` | Data Layer Variable | `contact_phone` | auto |
| `url.type` | URL, component Query, key `type` | | auto |

## Triggers

| Name | Type | Condition |
|---|---|---|
| `All Pages` | Page View | built in |
| `Consent Initialization` | Consent Initialization | built in |
| `PV - thank-you` | Page View | Page Path equals `/thank-you` |
| `CE - cta_click` | Custom Event | event equals `cta_click` |
| `CE - phone_click` | Custom Event | event equals `phone_click` |
| `CE - whatsapp_click` | Custom Event | event equals `whatsapp_click` |
| `CE - intent known contact` | Custom Event | event matches RegEx `^(whatsapp_click\|phone_click)$` AND `dl.known_contact` equals `true` |
| `Form - start` | Element Visibility + Click, or simplest: Click on `form input` (first interaction) | CSS selector `form input, form textarea`; fire once per page |
| `Form - submit` | Form Submission | Wait for tags 2000 ms, check validation on |
| `Scroll - 75` | Scroll Depth | Vertical 75% |
| `Click - outbound` | Just Links | Click URL does not contain `{{Page Hostname}}` |
| `Var - make url ready` | Trigger group / condition on each Make tag: `c.make_webhook_url` does not equal `PENDING` | used as an exception |

## Tags

| Name | Type | Trigger | Consent required | Notes |
|---|---|---|---|---|
| `CookieYes` | Custom HTML | Consent Initialization | none | Paste the CookieYes script; it sets defaults to denied |
| `GA4 - Config` | Google Tag | All Pages | analytics_storage | Tag id `{{c.ga4_measurement_id}}`; disable enhanced form interactions |
| `GA4 - generate_lead` | GA4 Event | PV - thank-you | analytics_storage | Event `generate_lead`, params `form_type = {{url.type}}` |
| `GA4 - form_start` | GA4 Event | Form - start | analytics_storage | params `form_type = {{dl.form_type}}` |
| `GA4 - form_submit` | GA4 Event | Form - submit | analytics_storage | diagnostic only, not a key event |
| `GA4 - cta_click` | GA4 Event | CE - cta_click | analytics_storage | params `cta_id`, `page_path` |
| `GA4 - phone_click` | GA4 Event | CE - phone_click | analytics_storage | params `page_path`, `known_contact` |
| `GA4 - whatsapp_click` | GA4 Event | CE - whatsapp_click | analytics_storage | params `page_path`, `known_contact` |
| `GA4 - scroll_75` | GA4 Event | Scroll - 75 | analytics_storage | |
| `GA4 - outbound_click` | GA4 Event | Click - outbound | analytics_storage | param `link_url = {{Click URL}}` |
| `Clarity` | Custom HTML | All Pages | analytics_storage | Standard Clarity snippet with `{{c.clarity_project_id}}` |
| `HubSpot tracking` | Custom HTML | All Pages, exception when `c.hubspot_portal_id` equals `PENDING` | ad_storage | `<script src="//js.hs-scripts.com/{{c.hubspot_portal_id}}.js" async defer></script>` |
| `Make - intent webhook` | Custom HTML | CE - intent known contact, exception when `c.make_webhook_url` equals `PENDING` | none (no cookie, data the visitor gave on a form) | see body below |

Consent settings live under each tag's Advanced settings > Consent settings > Require additional consent.

### Make intent webhook tag body

```html
<script>
(function(){
  try {
    var body = JSON.stringify({
      event: 'intent_click',
      intent: {{Event}},
      email: {{dl.contact_email}} || '',
      phone: {{dl.contact_phone}} || '',
      page_path: {{dl.page_path}} || '',
      ts: new Date().toISOString()
    });
    if (navigator.sendBeacon) navigator.sendBeacon({{c.make_webhook_url}}, new Blob([body], {type: 'application/json'}));
    else fetch({{c.make_webhook_url}}, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: body, keepalive: true});
  } catch (e) {}
})();
</script>
```

## Publish checklist (step 4 and again at step 6)

1. Preview mode, walk Home → Service → form start → submit → thank-you.
2. Confirm in the Tag Assistant summary: `GA4 - Config` fired on every page, `generate_lead` fired once on thank-you, `form_submit` once, click events on the buttons.
3. Decline consent in a fresh incognito window: no GA4, Clarity or HubSpot requests in the Network tab; form still submits.
4. Publish with a version name `v<date> <what changed>`.
