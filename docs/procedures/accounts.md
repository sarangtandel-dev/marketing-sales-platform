# Accounts register

Every outside account the platform depends on, who owns it and who can administer it. Keep this current: it's what [breach.md](breach.md), [rotate-secrets.md](rotate-secrets.md) and offboarding rely on.

- **Never record** passwords, keys or recovery codes here. They go in the password manager.
- **Every account** has two-factor authentication on.
- **Every account** has at least two admins, so nobody is a single point of failure.

## Agency accounts (shared across Clients)

| Account | What it runs | Owner | Admins | 2FA | Last reviewed |
|---|---|---|---|---|---|
| GitHub `sarangtandel-dev/marketing-sales-platform` | Code, CI, deploys, the `CLOUDFLARE_API_TOKEN` secret | Agency | [TO FILL] | [TO FILL] | [TO FILL] |
| Cloudflare account | Pages projects, the form Workers, D1 Lead Logs, Turnstile, Email Routing, DNS | Agency | [TO FILL] | [TO FILL] | [TO FILL] |
| healthchecks.io | The daily heartbeat | Agency | [TO FILL] | [TO FILL] | [TO FILL] |
| ntfy topic | Alert pushes (subject lines only, no personal data) | Agency | Whoever knows the topic URL | n/a | [TO FILL] |
| Uptime monitor | Checks the site and `/health` | Agency | [TO FILL] | [TO FILL] | [TO FILL] |
| Password manager | Every credential above | Agency | [TO FILL] | [TO FILL] | [TO FILL] |

## Per Client (copy this table for each Client)

### Client #0 (client-zero)

| Account | What it runs | Owner | Admins | 2FA | Last reviewed |
|---|---|---|---|---|---|
| Domain registrar | The domain | [TO FILL] | [TO FILL] | [TO FILL] | [TO FILL] |
| Brevo | Contacts, marketing list, double opt-in | [TO FILL] | [TO FILL] | [TO FILL] | [TO FILL] |
| Google Tag Manager, GA4, Search Console | Tracking and search | [TO FILL] | [TO FILL] | [TO FILL] | [TO FILL] |
| CookieYes | The consent banner and consent records | [TO FILL] | [TO FILL] | [TO FILL] | [TO FILL] |
| Owner alert mailbox | Receives Lead alerts (holds personal data) | [TO FILL] | [TO FILL] | [TO FILL] | [TO FILL] |

## Secret rotations

| Date | Secret | Why | Done by |
|---|---|---|---|
| | | | |
