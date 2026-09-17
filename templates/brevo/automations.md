# Brevo automations, per client

Build these four automations in Brevo > Automations. Names are fixed so the playbook check
matches. Placeholders in braces are Brevo contact attributes (appendix B section 8).

Send window: every marketing email step is preceded by a **Wait until** step: "next occurrence of
09:00-19:00, Monday-Saturday, client timezone". The acknowledgement has no wait.

## W1 acknowledgement

- **Entry**: contact added to list `<slug>-new-leads`.
- **Condition**: `FORM_TYPE` is one of contact, quote, booking. (Newsletter signups never enter this list.)
- **Step 1**: send email `ack` immediately (transactional tone, template 01).
- **Step 2**: add to list `<slug>-nurturing`; remove from `<slug>-new-leads`.
- **Re-entry**: allowed (a second form from the same person restarts the acknowledgement, which is correct: they asked again).

## W3 nurture

- **Entry**: contact added to list `<slug>-nurturing`.
- **Exit conditions** (Brevo "exit automation if" on the workflow): `DEAL_STAGE` in (Qualified, Proposal, Won, Lost) OR `MEETING_AT` is not empty OR `CONSENT_MARKETING` = false OR unsubscribed.
- Steps, each preceded by a condition check of the exit attributes (belt and braces) and the wait-until window:

| Wait | Email | Template |
|---|---|---|
| 1 day after entry | nurture-1 value | 02 |
| 2 days | nurture-2 proof | 03 |
| 3 days | nurture-3 objections | 04 |
| 3 days | nurture-4 offer | 05 |
| 5 days | nurture-5 last call | 06 |
| end | remove from `<slug>-nurturing`? **No.** Stay in the list so W5 can watch the 30-day silence. | |

- **Re-entry**: not allowed within 30 days.

## W5 re-engagement

- **Entry**: daily scheduled condition: in list `<slug>-nurturing` AND `DEAL_STAGE` in (New, Contacted) AND last email click older than 30 days AND last form submission older than 30 days AND `MEETING_AT` empty.
- **Step 1**: email `reengage-1` (template 07).
- **Step 2**: wait 7 days; if still no click: email `reengage-2` (template 08).
- **Exit**: any click, `DEAL_STAGE` change, `MEETING_AT` set.
- Deal closure at day 44 is done by the Make `stage-sync` weekly branch, not here.

## W6 meeting reminders

- **Entry**: attribute `MEETING_AT` changes and is in the future.
- **Step 1**: wait until `MEETING_AT` − 24 h: send `reminder-24h` (template 09) unless `CONSENT_WHATSAPP` = true and WhatsApp templates are approved (then Make sends WhatsApp and this step is skipped by a condition on `CONSENT_WHATSAPP`).
- **Step 2**: wait until `MEETING_AT` − 3 h: send `reminder-3h` (template 10), same WhatsApp condition.
- **Step 3**: wait until `MEETING_AT` + 3 h: if `MEETING_OUTCOME` = no_show send `no-show` (template 11).
- **Exit**: `MEETING_OUTCOME` in (completed, canceled).

## Webhooks (Brevo > Transactional > Settings > Webhooks, and Marketing > Webhooks)

Events `opened`, `clicked`, `unsubscribed`, `hard_bounce` → the client's Make router URL. Brevo adds an `event` field, which the router uses.

## Sender and UTM defaults

- Sender: `{{BRAND_NAME}} <hello@{{DOMAIN}}>`, reply-to the owner's mailbox.
- Campaign settings > "Add UTM tracking": source `brevo`, medium `email`, campaign = the email name (`nurture-1` etc.).
- Footer: physical address, unsubscribe link, one line: "You're receiving this because you contacted {{BRAND_NAME}} on {{DOMAIN}}."
