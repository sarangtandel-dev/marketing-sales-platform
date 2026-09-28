# Release the form Worker

How to set up and release the production form Worker (ADR-0013), and how to roll it back. Run every command from `packages/form-worker`.

`wrangler.jsonc` has two environments:
- the top level is **production**: pass `--env=""` to every command, so wrangler never guesses
- `preview` is the **preview Worker**: pass `--env preview`

`pnpm check:launch clients/<slug>` fails until the production config is real.

## First release (once per Client, ticket 36)

### 1. DNS and Email Routing

The owner alert goes out through Cloudflare Email Routing, which needs the domain's DNS on Cloudflare (ADR-0012).

- **Before moving DNS:** list every existing record at the current DNS host, especially `MX`, `SPF` (`TXT v=spf1 …`), `DKIM` and `DMARC`. The business's email runs on these.
- **Moving the domain to Cloudflare:** check that every record came across before changing the nameservers at the registrar.
- **If the domain already receives email elsewhere (Google Workspace, Zoho and so on):** turning on Email Routing replaces the domain's `MX` records and would break that mailbox. Use a subdomain instead: enable Email Routing on `alerts.<domain>`, and send from `alerts@alerts.<domain>`.
- **Turn on Email Routing,** then add the owner's address as a destination and click the verification link it gets.
- **In `wrangler.jsonc`:**
  - `send_email[].destination_address` and `vars.ALERT_TO` are that verified address
  - `vars.ALERT_FROM` is an address on the routed domain or subdomain

### 2. The Lead Log

```bash
pnpm exec wrangler d1 create lead-log-<slug> --location apac
```

- `apac` is the location hint near India (ADR-0029).
- Put the printed `database_id` in `wrangler.jsonc` (`d1_databases[0]`), then apply the migrations:

```bash
pnpm exec wrangler d1 migrations apply LEAD_LOG --remote --env=""
```

### 3. Config

In `wrangler.jsonc`, top level:

| Setting | Value |
|---|---|
| `vars.CLIENT_SLUG` | the Client's slug |
| `vars.ALLOWED_ORIGINS` | the site's origin, e.g. `https://www.<domain>` (add the bare domain too if it serves pages) |
| `vars.MONITOR_TEST_EMAIL` | an address we own, used by the daily test Lead |
| `vars.BREVO_MARKETING_LIST_ID`, `BREVO_DOI_TEMPLATE_ID`, `BREVO_DOI_REDIRECT_URL` | from the Client's Brevo account (see `docs/development.md`) |
| `routes` | `[{ "pattern": "forms.<domain>", "custom_domain": true }]` |

- `workers_dev` stays `false`.
- The site definition's form `endpoint` is `https://forms.<domain>/lead`.
- Regenerate the forms manifest (`pnpm forms:manifest`) whenever the forms change. A test fails if it's stale.

### 4. Secrets

```bash
for s in TURNSTILE_SECRET_KEY BREVO_API_KEY MONITOR_SECRET HEARTBEAT_URL NTFY_URL; do
  pnpm exec wrangler secret put "$s" --env=""
done
```

| Secret | Where it comes from |
|---|---|
| `TURNSTILE_SECRET_KEY` | the production Turnstile widget (ADR-0028) |
| `BREVO_API_KEY` | the Client's Brevo account |
| `MONITOR_SECRET` | `openssl rand -hex 32` |
| `HEARTBEAT_URL` | a healthchecks.io check with period 1 day and grace 3 hours |
| `NTFY_URL` | `https://ntfy.sh/<a random 24+ character topic>`. Subscribe to it in the ntfy app |

### 5. Deploy and verify

```bash
pnpm exec wrangler deploy --env=""
curl -sI https://forms.<domain>/health          # 200
```

Then send a signed test Lead and follow the printed clean-up command:

```bash
MONITOR_SECRET=… MONITOR_TEST_EMAIL=… node scripts/send-test-lead.ts https://forms.<domain>/lead
```

Record the release in the launch ticket.

## Every later release

1. `pnpm test` and `pnpm typecheck` pass on `main`.
2. **Migrations go out before the code that needs them:**
   ```bash
   pnpm exec wrangler d1 migrations apply LEAD_LOG --remote --env=""
   ```
   Migrations only ever add (tables, nullable columns). Never drop or rename in the same release as the code change, so a rollback still works on the new schema.
3. Run `pnpm exec wrangler deploy --env=""`, then check `/health`.

## Rollback

```bash
pnpm exec wrangler deployments list --env=""
pnpm exec wrangler rollback <version-id> --env=""
```

- A rollback changes code only. Secrets, vars and the Lead Log stay as they are.
- A bad migration can't be rolled back: see [restore-lead-log.md](restore-lead-log.md).

## The preview Worker

- Same steps with `--env preview`, and its own database `lead-log-preview`.
- Its secrets:
  - `TURNSTILE_SECRET_KEY` is Turnstile's test secret `1x0000000000000000000000000000000AA`
  - `MONITOR_SECRET` for the manual test script
  - **never a `BREVO_API_KEY`:** QA Leads are stored and alerted, never delivered
  - **never an `NTFY_URL`:** anyone can post to the preview, so its alerts must not reach the owner's phone
- Its `ALERT_TO` and `send_email` destination are a QA inbox, not the owner's. Its alerts start with `[PREVIEW]` (`ALERT_SUBJECT_PREFIX`). The launch check fails if that prefix, or the skipped hostname check, ever reaches the production config.
- Point the repository variable `PREVIEW_FORM_ENDPOINT` at `https://msp-form-worker-preview.<account>.workers.dev/lead`.
