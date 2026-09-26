# 35: Monitoring: daily test Lead and uptime

**What to build:** Once a day, a scheduled check submits a test Lead through the real Worker endpoint and confirms it reached both the Lead Log and Brevo. If either step fails, it alerts us, then cleans up. An external monitor watches the site and a Worker health route. We hear about a broken Lead path within a day, and about downtime within minutes (ADR-0037, issue 19 #4).

**Blocked by:** 24, 26

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The Worker accepts a secret-signed test header in place of a Turnstile token only on its test path, and rejects an invalid or missing signature
- [ ] Test Leads are marked as tests and never trigger the normal owner alert
- [ ] The daily check confirms the Lead Log row and a successful Brevo delivery, and sends an alert through the email binding if either is missing
- [ ] After the check, the test contact is removed from Brevo and the test row from the Lead Log
- [ ] A Worker health route returns OK without writing anything
- [ ] A free external uptime monitor checks the home page and the health route, and alerts by email. Its setup is documented
- [ ] Seam 2 tests: valid and invalid signature, test flagging, no owner alert, cleanup
