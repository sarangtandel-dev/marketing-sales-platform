# Incident: Leads aren't arriving, or an alert fired

Use this when:
- an alert arrives: "Daily check failed", "Lead not delivered to Brevo", or a digest of them
- the healthchecks.io heartbeat goes quiet
- the uptime monitor reports `/health` down
- the owner says enquiries stopped

Run every command from `packages/form-worker` with `--env=""` (production).

## 1. Is it still happening?

- **Worker health:** `curl -sI https://forms.<domain>/health` should answer `200`. A `503` means D1 is unreachable.
- **Live logs:** `pnpm exec wrangler tail --env=""`, then submit the site's form yourself. The same logs, with traces, are in the dashboard under Workers → msp-form-worker → Logs.
- **The Lead Log in the last day:**
  ```bash
  pnpm exec wrangler d1 execute LEAD_LOG --remote --env="" --command \
    "SELECT delivery_status, alert_status, failure_alert_status, count(*) FROM leads
     WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day') GROUP BY 1,2,3"
  ```
- **Spam rejections by day:**
  ```bash
  pnpm exec wrangler d1 execute LEAD_LOG --remote --env="" --command "SELECT * FROM spam_counts ORDER BY day DESC LIMIT 14"
  ```

## 2. Common causes

| Symptom | Likely cause | Fix |
|---|---|---|
| Daily check: "isn't in ALLOWED_ORIGINS" | The site moved domain, or `www` changed | Fix `vars.ALLOWED_ORIGINS`, then redeploy |
| Daily check: "Turnstile rejects our Turnstile secret" | The secret was rotated or mistyped | `wrangler secret put TURNSTILE_SECRET_KEY --env=""` ([rotate-secrets.md](rotate-secrets.md)) |
| A spike of Turnstile rejections | The widget's hostnames don't include the domain, or a bot wave | Check the widget's hostnames in the Turnstile dashboard |
| "Not delivered to Brevo" with `401` | The Brevo key was revoked | New key, then requeue (step 3) |
| "Not delivered to Brevo" with `400` naming an attribute | A Brevo attribute is missing | Create it, then requeue |
| Pushes arrive but no emails | Email Routing is broken, or the destination is unverified | Email Routing dashboard. Leads are safe in the Lead Log |
| Heartbeat quiet, no alerts at all | Crons stopped, or the Worker is broken | Check triggers in the dashboard; roll back ([release-worker.md](release-worker.md)) |

## 3. Recover

**Requeue Leads that failed delivery** (after fixing the cause). They're retried by the next 5-minute cron:

```bash
pnpm exec wrangler d1 execute LEAD_LOG --remote --env="" --command \
  "UPDATE leads SET delivery_status = 'retrying', delivery_attempts = 0,
     next_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE delivery_status = 'failed' AND created_at >= '<start of the incident, ISO>'"
```

- Leads that were never alerted are listed by id in the next daily check.
- Read each one with `SELECT * FROM leads WHERE id = '…'` and pass it to the owner.

## 4. Afterwards

- **Write down what happened** in the Client's incident log: start, end, cause, Leads affected (ids only) and the fix.
- **If personal data may have been exposed** (not just delayed), follow [breach.md](breach.md).
