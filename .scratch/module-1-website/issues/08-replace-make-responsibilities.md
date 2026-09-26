# Make's responsibilities need a new home

Status: ready-for-agent
Source: file audit, 2026-09-17

## Problem

Removing Make (ADR-0002) leaves these jobs without an owner:

- the honeypot/spam check (`form-hidden-fields.html:24`)
- the raw lead audit log in Google Sheets (`docs/appendix-b-tracking-spec.md` §9)
- the intent webhook (`container-spec.md:59-82`)
- syncing deal stage and meeting data into Brevo (`templates/brevo/automations.md:20,36,40,44`)
- sending WhatsApp messages (`automations.md:45`)

reCAPTCHA is also referenced; the new stack would use Turnstile, checked in the Worker.

## To decide

- Where each job goes: the Worker, Worker storage, or Brevo.
- The retention period for any lead data we store (ADR-0011).

## Comments

2026-09-17, Round 2:
- The spam check (honeypot plus Turnstile) moves into the Worker.
- The raw lead audit log becomes the Worker's Lead Log (ADR-0013). Owner alerts are sent from the Lead Log path.

Still open:
- the intent webhook
- deal-stage and meeting sync into Brevo (Module 2)
- sending WhatsApp messages

2026-09-17, milestones (ADR-0039): The spam check and Lead Log are M1 (ADR-0013). The intent webhook is replaced by `contact_click` events (ADR-0022). Deal-stage and meeting sync is Module 2. WhatsApp sending is DESIGNED.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0:** spam check, Lead Log, owner alert. The rest is unchanged.

2026-09-27, build: Implemented by the form Worker (tickets 22–26). It covers the honeypot and Turnstile checks, the raw Lead Log (D1) and Brevo delivery. Deal-stage sync belongs to Module 2 (ADR-0036). Ready to close once the M0 build is reviewed.
