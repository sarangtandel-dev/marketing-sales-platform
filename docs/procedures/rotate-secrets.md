# Rotate secrets

Rotate a secret at once if it may have leaked, when someone with access leaves, and once a year in any case. Run Worker commands from `packages/form-worker` (use `--env preview` for the preview Worker). The new value takes effect on the next request; no redeploy is needed.

| Secret | Where it lives | How to rotate |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Worker secret | Turnstile dashboard → the widget → Rotate secret key, then `wrangler secret put TURNSTILE_SECRET_KEY --env=""`. The old key keeps working for a short overlap. |
| `BREVO_API_KEY` | Worker secret | In Brevo, create a new API key, `wrangler secret put BREVO_API_KEY --env=""`, send a test Lead, then delete the old key in Brevo. |
| `MONITOR_SECRET` | Worker secret, and whoever runs `send-test-lead.ts` | `openssl rand -hex 32`, then `wrangler secret put MONITOR_SECRET --env=""`. |
| `HEARTBEAT_URL` | Worker secret | healthchecks.io → the check → regenerate the ping URL, then `wrangler secret put HEARTBEAT_URL --env=""`. |
| `NTFY_URL` | Worker secret, and the ntfy app on the owner's phone | Pick a new random topic, `wrangler secret put NTFY_URL --env=""`, and subscribe to the new topic in the app. |
| `CLOUDFLARE_API_TOKEN` | The GitHub `preview` and `production` environments' secrets | Cloudflare → My Profile → API Tokens → Roll, then update both environments' secrets. Keep it **Pages: Edit** only. |

Afterwards:

- Send a signed test Lead, or wait for the next daily check.
- Note the rotation (secret name and date, never the value) in the accounts register ([accounts.md](accounts.md)).
