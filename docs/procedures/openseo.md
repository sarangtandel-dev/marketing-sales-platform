# OpenSEO: set up and connect

[OpenSEO](https://github.com/every-app/open-seo) (MIT) gives Claude SEO data through an MCP server. It covers keyword research, clustering, local SEO, competitors, site audits, rank tracking and backlinks. We self-host it on our Cloudflare account, behind Cloudflare Access.

It's used by:
- `/site-seo-plan`, for the SEO targets in the strategy brief (ADR-0037 step 3, ADR-0027)
- `/site-review`, for the QA audit
- Client reports later (issue 39)

The skills are installed on the agency machine as `openseo-*` (for example `openseo-keyword-research`, `openseo-seo-audit`), pinned to commit `0ffff93`.

## One-time setup (a person)

1. **DataForSEO:** create an account at dataforseo.com. New accounts get $1 of credit; the minimum top-up is $50. Keep the "Base64" API credentials.
2. **Cloudflare R2:** open R2 once in the dashboard. It needs a payment method on file, even within the free tier.
3. **Deploy:**
   ```bash
   git clone https://github.com/every-app/open-seo.git && cd open-seo
   git checkout 0ffff93101043aad7600a3b6a499a0cd2887ef49
   corepack enable && pnpm install
   pnpm alchemy login                # answer yes to "Customize OAuth scopes?" and enable access:write
   pnpm alchemy cloudflare bootstrap
   cp .env.selfhost.example .env.selfhost
   ```
   Then fill in `.env.selfhost`:
   - `DATAFORSEO_API_KEY`: the Base64 credentials
   - `ACCESS_ALLOWED_EMAILS`: our emails only
   - `OPENSEO_TELEMETRY_DISABLED=1`

   Deploy:
   ```bash
   pnpm deploy:selfhost --yes
   ```
4. **MCP login:** in Cloudflare Zero Trust:
   - go to Access controls → Applications → OpenSEO → Edit → Additional settings → OAuth
   - turn on **Managed OAuth**
   - allow `localhost` loopback redirect URIs
5. **Connect Claude Code:**
   ```bash
   claude mcp add --transport http --scope user openseo https://<openseo-worker-host>/mcp
   ```
   Log in through the browser when asked, then check with the `whoami` tool.
6. **Record it:**
   - the account, admins and DataForSEO billing go in [accounts.md](accounts.md)
   - the DataForSEO key lives only in `.env.selfhost` and the Worker secret, never in this repo

## Cost control

- Each skill calls `whoami` first, which shows the remaining credit.
- A keyword plan for one Client costs cents to a few dollars.
- Set a low-balance alert in DataForSEO.
