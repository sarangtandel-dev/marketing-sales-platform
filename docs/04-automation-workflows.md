# 04 — Automation Workflows

Six workflows cover what a small business actually needs in its first year. W1 to W3 are the three
the platform exists for: instant follow-up, campaign tracking, and nurturing. W4 to W6 are the
next three every client asks for within a month. Each is written as trigger, steps, exit conditions,
tools, what to measure, and which plan tier it needs.

| Workflow | Runs in | Free tier feasible? |
|---|---|---|
| W1 New lead: instant follow-up + internal alert | Make router, Brevo, WhatsApp Cloud | Yes |
| W2 Campaign tracking with UTMs | Webflow snippet, GTM, GA4, Sheet, Looker | Yes |
| W3 Lead nurturing sequence | Brevo automation, Make stage-sync | Yes up to ~50 leads/day |
| W4 Lead scoring lite | Make, Brevo webhooks, GTM intent webhook | Make Core recommended (credits) |
| W5 Re-engagement of stale leads | Brevo automation, Make stage-sync | Yes; Make Core at volume |
| W6 Meeting booked: reminders and no-show | HubSpot Meetings, Make, Brevo, WhatsApp | Yes |

## W1 — New lead: instant follow-up and internal alert

**Purpose**: nobody waits. The prospect gets a reply in minutes, the owner knows within a minute.

**Trigger**: Webflow form submission. Webflow's site-level form webhook posts to the Make `router` scenario's custom webhook, the same URL Brevo and GTM post to. The first module routes on the `event` field (`form_submission`, `brevo_event`, `intent_click`).

**Steps** (Make, in this order):

1. Append the raw row to the Sheet `leads` tab. This runs first so no lead is ever lost.
2. Normalise: trim, lowercase email, phone to E.164 with the client's default country code, map `form_type`. If `form_type = newsletter`, skip steps 3, 5 and 6 (no deal, no WhatsApp, no owner alert) and run only the Brevo branch.
3. Router branch **HubSpot**: search contact by email, then phone. Create or update. Set first-touch properties only if empty, last-touch always, `form_type_last`, `consent_whatsapp`. Create deal `<form_type> · <name>` in stage New, associate contact. Create task "Call <name> (<form_type>)" due +24 h, owner = client sales user. Write HubSpot ids back to the Sheet row.
4. Router branch **Brevo**: create or update contact with all attributes; add to `<slug>-new-leads`. If `form_type = newsletter`, add only to `<slug>-newsletter` instead. Write the Brevo contact id back to the Sheet row.
5. Router branch **WhatsApp**: if `consent_whatsapp = true` and the client's acknowledgement template is approved, send the template via WhatsApp Cloud with `{{name}}` and `{{form_type}}`. Mark `whatsapp_sent` in the Sheet.
6. Router branch **Alert**: Slack message to `#leads-<slug>` with name, phone, email, form type, `lead_source_detail`, message excerpt, HubSpot link. Optional WhatsApp to the owner's number for clients without Slack.
7. Brevo automation "W1 acknowledgement" (trigger: contact added to `<slug>-new-leads`): send the acknowledgement email immediately (transactional, no quiet hours), then add the contact to `<slug>-nurturing` and remove it from `<slug>-new-leads`. The list move is what starts W3.

**Exit**: none, this is a one-shot flow. Errors in any branch go to the handler: 3 retries, then `failed` tab plus agency Slack alert.

**Measure**: median seconds from Webflow timestamp to Slack timestamp (target under 60 s); percentage of leads with HubSpot id in the Sheet (target 99%); acknowledgement delivery rate in Brevo.

**Cost**: about 8-12 Make credits per lead, so 830-1,250 leads per month on a 10,000-credit Core plan if nothing else ran. The `stage-sync` polling described in W3 costs about 400 credits per client per month regardless of leads, so a Core plan realistically covers 8 clients and about 600 leads per month. Beyond that, Make Pro or the Phase 1 Lead Hub.

## W2 — Campaign tracking with UTMs

**Purpose**: every paid rupee and every email link is traceable to leads and deals, not just clicks.

**Trigger**: continuous. UTMs are captured on every visit and attached to every lead.

**Steps**:

1. **Build**: every campaign link is generated from the `utm-builder` tab in the client Sheet, using the dropdown vocabulary in appendix A. No hand-typed UTMs.
2. **Shorten** for offline and WhatsApp: a Cloudflare redirect rule `go.<domain>/<code>` to the full UTM URL. QR codes on print, shop front and invoices point at the short link.
3. **Capture**: the persistence snippet stores first-touch (localStorage) and last-touch (sessionStorage) and fills the hidden fields (appendix B).
4. **Attach**: W1 writes first and last touch onto the HubSpot contact, full detail into Brevo and the Sheet.
5. **Report**: Looker Studio report pages:
   - Traffic by source/medium/campaign (GA4).
   - `generate_lead` by campaign (GA4).
   - Leads and deals by `utm_campaign_first` and `utm_campaign_last` (Sheet).
   - Won revenue by first-touch campaign (Sheet, `deal_stage = Won`, amount from HubSpot via stage-sync).
6. **Review ritual**: monthly, 30 minutes with the client: which campaigns produced leads, which produced deals, kill or scale. The report template contains one fixed paragraph explaining why GA4 and CRM counts differ.

**Exit**: none.

**Measure**: share of leads with non-empty `utm_source_first` (target 80%; the rest are direct or organic which legitimately have none); cost per lead per campaign (ad spend entered in the Sheet monthly).

## W3 — Lead nurturing sequence

**Purpose**: leads who do not convert in the first 24 hours get a structured 14-day sequence instead of silence.

**Trigger**: Brevo, contact added to `<slug>-nurturing` (done by the W1 automation after the acknowledgement) with `FORM_TYPE` in (contact, quote, booking).

**Sequence** (Brevo automation, emails from the agency template set):

| Day | Email | Goal |
|---|---|---|
| 0 | Acknowledgement (from W1) | Set expectation: "we call within 1 business day" |
| 1 | Value: how we solve `<service>` for people like you | Educate |
| 3 | Proof: 2 customer stories, reviews link, GBP link | Trust |
| 6 | Objection: price, timing, "what if" answers, FAQ | Remove friction |
| 9 | Offer: limited incentive or free assessment, calendar link | Convert |
| 14 | Last call: "shall we close your file?" with reply-to owner | Force a decision |

Each email carries `utm_source=brevo&utm_medium=email&utm_campaign=nurture-<n>` on every link.

**Exit conditions** (checked before every send):

- `MEETING_AT` is set (a booking, written by stage-sync),
- `DEAL_STAGE` in (Qualified, Proposal, Won, Lost). Brevo does not track replies, so the owner moves the deal to Qualified when a prospect replies; that is the exit,
- unsubscribed or hard bounce,
- `CONSENT_MARKETING = false` (then only the acknowledgement is sent; it is transactional).

`Contacted` does not exit W3: an owner's first call attempt should not stop the sequence.

**Stage sync** (Make `stage-sync` scenario, scheduled every 2 hours between 09:00 and 21:00 client time, about 180 runs and 400 credits per client per month): one run polls HubSpot for deal stage changes, new meetings and meeting outcomes, then updates Brevo `DEAL_STAGE`, `MEETING_AT`, `MEETING_OUTCOME`, the Sheet `deal_stage` and `amount` columns. Brevo's automation reads the attributes before each step, so an exit takes effect within 2 hours, which is fine for day-spaced emails.

**Measure**: open and click rate per step, reply rate, percentage of enrolled contacts reaching Qualified within 14 days, unsubscribe rate (alarm above 1%).

**Limit**: Brevo free sends 300 emails/day per account. Once all six steps overlap (from day 14), a client generating about 50 leads/day sends 300 nurture emails a day and hits the cap. Move that client to Brevo Starter.

## W4 — Lead scoring lite

**Purpose**: the owner calls the hottest lead first. Kept deliberately simple because HubSpot Free page views cannot trigger anything.

**Trigger**: three sources, all arriving at the Make router webhook:

| Signal | Source | Score |
|---|---|---|
| Form submitted, type quote or booking | W1 | +30 |
| Form submitted, type contact | W1 | +20 |
| Form submitted, type newsletter | W1 | +5 |
| Email clicked | Brevo `clicked` webhook | +5 per click, max +15 |
| Email opened | Brevo `opened` webhook | +1, max +3 |
| `whatsapp_click` or `phone_click` by known contact | GTM intent webhook | +10 |
| Second form submission within 30 days | W1 | +15 |

**Steps**: Make finds the HubSpot contact by email or phone, reads `lead_score`, adds, writes back, mirrors to Brevo `LEAD_SCORE` and the Sheet. If the new score crosses 40 and the deal is still New or Contacted: create task "Call now, hot lead" due +2 h and post to Slack with a fire emoji.

**Exit**: score stops changing once `DEAL_STAGE` is Won or Lost.

**Measure**: conversion to Qualified for score ≥ 40 versus below (if the gap is not at least 2x after 90 days, the weights are wrong).

**Cost**: 3-5 credits per signal. This is the workflow that pushes an agency onto Make Core.

## W5 — Re-engagement of stale leads

**Purpose**: leads that went quiet get one more structured attempt, then the pipeline is cleaned.

**Trigger**: Brevo automation, daily check: contact in `<slug>-nurturing`, `DEAL_STAGE` in (New, Contacted), no email click and no form submission for 30 days.

**Steps**:

1. Day 30: email "Still looking for `<service>`?" with a one-question reply prompt and calendar link.
2. Day 37: email "Last one from us" with a small incentive or a useful resource.
3. Day 44: Make (`stage-sync` scenario, weekly branch) moves the deal to Lost with `lost_reason = unresponsive`, moves the contact to `<slug>-cold`, removes from `nurturing`.

**Exit**: any reply, click, form submission, or stage change to Qualified or later.

**Measure**: reactivation rate (target 3-5%), pipeline hygiene (no deals older than 45 days in New).

## W6 — Meeting booked: reminders and no-show

**Purpose**: booked calls happen.

**Trigger**: a booking. With Cal.com, its native webhook posts to the router instantly (recommended for clients who want reminders). With HubSpot Meetings, the `stage-sync` scenario picks up new meeting engagements on its 2-hour schedule, so reminder timing is coarser.

**Steps**:

1. Make: move the deal to Contacted if still New; write `MEETING_AT` to Brevo; Slack alert to owner.
2. Brevo automation on `MEETING_AT`: reminder email at −24 h and −3 h with the meeting link and the owner's phone (−3 h rather than −1 h because of the 2-hour poll). If `CONSENT_WHATSAPP = true` and templates are approved, the router sends the WhatsApp reminders at the same offsets instead of email.
3. Owner marks the outcome in HubSpot (meeting outcome property). `stage-sync` copies it to Brevo `MEETING_OUTCOME`. If it is `no-show`: Brevo sends "we missed you, pick a new time" with the calendar link and `stage-sync` creates a HubSpot task for the owner to call.

**Exit**: meeting marked completed, or deal moved to Qualified or later.

**Measure**: show rate (target above 70%), re-book rate after no-show.

## Cross-workflow rules

- **One router per client.** The router's trigger is a Make custom webhook. Webflow's form webhook, Brevo's event webhooks, GTM's intent tag and Cal.com all post to that one URL, and the first module routes on `event`. This keeps a client within the 2-scenario free cap (router plus stage-sync) if they insist on their own Make account, and keeps blueprints identical across clients.
- **Idempotency**: every Make write to HubSpot and Brevo is an upsert keyed on email or phone. Re-running a failed row never creates a duplicate.
- **Consent gates**: marketing emails require `CONSENT_MARKETING`; WhatsApp requires `CONSENT_WHATSAPP`; the acknowledgement email and the internal alert require neither because they are transactional and internal.
- **Quiet hours**: nurture, re-engagement and reminder emails are held by a Brevo "wait until" step to the 09:00-19:00 window in the client's timezone; WhatsApp reminders are held by the router to 10:00-18:00. The W1 acknowledgement (email and WhatsApp) and the owner alert are exempt because they are transactional.
- **Every email link carries UTMs** so W2 attribution includes nurture touches.
- **Unsubscribes**: Brevo's `unsubscribed` webhook reaches the router, which writes `unsubscribed_at` on the Sheet row and sets HubSpot `consent_whatsapp = false` if the unsubscribe was from WhatsApp.
- **Blueprint versioning**: the agency master blueprint carries a version in its name; every client folder notes which version it runs. Upgrades are re-imports, never in-place edits.
