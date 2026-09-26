# 23: Owner alert via Cloudflare Email Routing

**What to build:** Every new Lead sends the owner an email alert from the Worker, after the Lead Log write, through Cloudflare Email Routing's send-email binding. The owner hears about every enquiry even if Brevo is down (ADR-0013, issue 19 #5).

**Blocked by:** 22

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] An alert is sent for every non-test Lead after the Lead Log write, containing the submitted fields and the form type
- [ ] Whether the alert was sent is recorded on the Lead Log row
- [ ] An alert failure never changes the Visitor's success response
- [ ] The destination address comes from configuration, and the setup notes say it must be verified in Email Routing
- [ ] Seam 2 tests with a faked binding: the alert is sent; the alert is sent when Brevo is unreachable; an alert failure is recorded
