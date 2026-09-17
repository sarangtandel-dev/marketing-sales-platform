---
status: accepted
---

# Attribution tracking keeps personal data out of the browser, uses last non-direct touch, and has one event source

**No personal data in the browser:**

- No personal data goes into browser storage, the dataLayer or GA4.
- `known_contact` is a flag with an expiry and no contact details.

**Attribution storage:**

- First and last touch are kept in browser storage for 90 days.
- In Regions that require consent, they are written only after consent (ADR-0020).
- Attribution is sent with the form, and the Worker stores it in the Lead Log.

**Last touch means "last non-direct":**

- It updates on any UTM, any click ID, or an outside referrer. Referrers are classified as organic, social or referral using a shared domain list.
- A direct visit never overwrites it.

**Click IDs:**

- They come from a shared, configurable list, starting with `gclid`, `gbraid`, `wbraid`, `msclkid`, `fbclid`, `ttclid`, `li_fat_id` and `twclid`.
- They are stored in both first and last touch.

**Events:**

- Site components push every event, based on the site definition. GTM only listens and never uses its own click triggers.
- Phone, WhatsApp, SMS and email clicks become one `contact_click` event with a `channel` parameter.
- `cta_click` carries `cta_type`.

This replaces the Phase 0 snippet's behaviour, which stored contact details, wrote before consent, and let two sources emit the same events. A new automated test suite must cover consent gating, last non-direct touch, every click ID, and personal data never entering the dataLayer (issue 14).

## Milestone

M1 See ADR-0039.
