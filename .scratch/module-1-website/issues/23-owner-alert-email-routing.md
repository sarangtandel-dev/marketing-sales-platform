# 23: Owner alert via Cloudflare Email Routing

**What to build:** Every new Lead sends the owner an email alert from the Worker, after the Lead Log write, through Cloudflare Email Routing's send-email binding. The owner hears about every enquiry even if Brevo is down (ADR-0013, issue 19 #5).

**Blocked by:** 22

Status: done

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] An alert is sent for every non-test Lead after the Lead Log write, containing the submitted fields and the form type
- [x] Whether the alert was sent is recorded on the Lead Log row
- [x] An alert failure never changes the Visitor's success response
- [x] The destination address comes from configuration, and the setup notes say it must be verified in Email Routing
- [x] Seam 2 tests with a faked binding: the alert is sent; the alert is sent when Brevo is unreachable; an alert failure is recorded (the Brevo case is added in ticket 24)

## Comments

2026-09-27: built.

- **When it runs:** after the Lead Log write, in `ctx.waitUntil`, so the Visitor's reply never waits for it. It runs only for a newly created Lead, so a resubmission with the same token doesn't alert twice.
- **How it sends:** the binding's structured `send({ from, to, subject, text })` form. The text holds the submitted fields, page URL, time and lead ID.
- **Recording:** `alert_status` on the row is set to `sent` or `failed`.
- **Tests:** a fake mailer Worker stands in for the binding in Miniflare and records each send through a service binding. There are 4 tests: sent with details, failure recorded with success unchanged, no double alert, no alert for spam.
- **Config:** `wrangler.jsonc` has the `send_email` binding and `ALERT_FROM`/`ALERT_TO` vars, with example.com placeholders until the real addresses are verified in Email Routing (ticket 36). `wrangler deploy --dry-run` accepts it.
- **Still to do:** the "alert still sent when Brevo is unreachable" test belongs with Brevo delivery (ticket 24). Test Leads skipping the alert is ticket 35.
