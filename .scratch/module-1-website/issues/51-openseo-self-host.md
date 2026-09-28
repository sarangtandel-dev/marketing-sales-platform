# Self-host OpenSEO and connect it to Claude Code

Status: ready-for-human
Source: website tools plan, 2026-09-28

Follow `docs/procedures/openseo.md`:
- a DataForSEO account and top-up
- R2 turned on
- `pnpm deploy:selfhost`
- Managed OAuth on the Access application
- `claude mcp add openseo …`
- the accounts register filled in

Needed before `/site-seo-plan` can run for Client #0. The skills (`openseo-*`) are already installed.

**M0** (feeds ticket 33's copy).

2026-09-28, prepared:
- OpenSEO is cloned at `~/Documents/Code/open-seo` (commit 0ffff93) and its dependencies are installed from its lockfile. The self-host build passes locally.
- `.env.selfhost` (gitignored there) has `ACCESS_ALLOWED_EMAILS` set to the owner and telemetry off.

Left for a person:
- the DataForSEO key in that file
- R2 turned on
- `pnpm alchemy login`, `pnpm alchemy cloudflare bootstrap` and `pnpm deploy:selfhost --yes`
- Managed OAuth
- `claude mcp add`
