---
status: accepted
---

# Forms use unticked, per-channel marketing opt-ins in every Region

**The enquiry itself:**

- Submitting a form is a request for a reply, so it needs no checkbox.
- A privacy notice link sits next to the submit button.

**Marketing consent:**

- Each marketing channel the Client actually uses (email, SMS, WhatsApp…) gets its own **unticked** checkbox.
- We use opt-in **in every Region**, even where opt-out would be legal. The region config changes only the wording, e.g. the US TCPA disclosure for SMS.

**Rules set by region and platform:**

- Region config has a **double opt-in flag** for email marketing (e.g. Germany). When it is set, Brevo sends a confirmation email before the contact counts as subscribed.
- WhatsApp marketing opt-in follows Meta's WhatsApp Business opt-in rules.

**Consent records:** every consent is stored with the exact version of the wording, a timestamp, the page URL and the form ID, in both the Lead Log and Brevo.

We rejected opt-out defaults where the law allows them. One form component and one Brevo consent model worldwide outweigh the small loss of list growth.

## Milestone

M0: unticked email marketing opt-in, with the wording version stored. SMS, WhatsApp and double opt-in: DESIGNED until a Client needs them. See ADR-0039.
