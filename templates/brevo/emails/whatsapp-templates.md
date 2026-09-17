# WhatsApp templates (submit in Meta Business Manager > Message templates, category Utility)

Names are fixed; the Make router references them.

**`ack_v1`** (Utility)
> Hi {{1}}, thanks for contacting {{BRAND_NAME}} about {{2}}. {{3}} will call you within one business day. Urgent? Reply here.
> Params: 1 = first name, 2 = form type/service, 3 = owner first name

**`reminder_24h_v1`** (Utility)
> Hi {{1}}, reminder: your call with {{BRAND_NAME}} is tomorrow at {{2}}. Join: {{3}}. Need to move it? Reply RESCHEDULE.

**`reminder_3h_v1`** (Utility)
> Hi {{1}}, your call with {{BRAND_NAME}} is at {{2}} today. Join: {{3}}.

**`noshow_v1`** (Utility)
> Hi {{1}}, we missed each other at {{2}}. Pick a new time: {{3}}, or reply with a time that suits you.

Rules: only send to contacts with `consent_whatsapp = true`; only 10:00-18:00 client time; never marketing content in Utility templates (Meta rejects and can ban the number).
