# 35: Monitoring: daily test Lead and uptime

**What to build:** Once a day, a scheduled check submits a test Lead through the real Worker endpoint and confirms it reached both the Lead Log and Brevo. If either step fails, it alerts us, then cleans up. An external monitor watches the site and a Worker health route. We hear about a broken Lead path within a day, and about downtime within minutes (ADR-0037, issue 19 #4).

**Blocked by:** 24, 26

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] The Worker accepts a secret-signed test header in place of a Turnstile token only on its test path, and rejects an invalid or missing signature
- [x] Test Leads are marked as tests and never trigger the normal owner alert
- [x] The daily check confirms the Lead Log row and a successful Brevo delivery, and sends an alert through the email binding if either is missing
- [x] After the check, the test contact is removed from Brevo and the test row from the Lead Log
- [x] A Worker health route returns OK without writing anything
- [ ] A free external uptime monitor checks the home page and the health route, and alerts by email. Its setup is documented (documented in docs/development.md; creating the monitor needs a person and the live URLs)
- [x] Seam 2 tests: valid and invalid signature, test flagging, no owner alert, cleanup

## Comments

2026-09-27: built. Checked under wrangler dev: the health route, the manual signed Lead, a bad secret, and the daily cron sending its alert.

- **Test path:** `x-msp-test-signature: t=<unix>,v1=<HMAC-SHA256("<t>.<body>", MONITOR_SECRET)>`. It's valid for 5 minutes and compared in constant time. A wrong, tampered or stale signature gets a 403 and nothing is stored. A valid one skips Turnstile, and the row is stored with `is_test = 1`.
- **Test Leads send no alerts of their own:** no new-lead alert, and no per-Lead "not delivered" alert. A bug found in the wrangler run sent that second alert for a non-retryable Brevo failure; a test for it now fails without the fix.
- **Daily check:** runs inside the Worker's daily cron by calling the real endpoint handler with a signed request, waiting for the background work, then checking the Lead Log row and Brevo delivery.
  - Any problem, including an unexpected error in the check itself, emails "Daily test Lead failed".
  - It cleans up both the row and the Brevo contact, using a new `deleteContact` call.
  - The purge and the check are independent: if one fails, the other still runs.
- **Manual script:** `scripts/send-test-lead.ts` runs the same check against any deployment before launch.
- **Health route:** `GET /health` returns `{ ok: true }` and writes nothing.
- **Tests:** 8 seam 2 tests.
- **Left for a person:** creating the external uptime monitor needs the live URLs (ticket 36). How to set it up is in `docs/development.md`.
