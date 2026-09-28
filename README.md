# Marketing + Sales Growth Platform

Agency-operated growth system for small businesses: website, SEO, lead capture, CRM and marketing automation. All modules share one knowledge base per Client. Module 1, website creation, is being built now; our own agency site is Client #0 (milestone M0).

- [`CONTEXT.md`](CONTEXT.md): the shared language (Client, Lead, Fact, Lead Log and so on).
- [`docs/adr/`](docs/adr/): every design decision, with its reasons.
- [`docs/development.md`](docs/development.md): setup (`pnpm install`, `pnpm test`, `pnpm dev`), the layout, building a site, the form Worker, monitoring, the launch check and deploying.
- [`docs/procedures/`](docs/procedures/): runbooks for releases, incidents, restores, secret rotation, breaches, data requests, onboarding a Client and the accounts register.
- [`docs/diagrams/`](docs/diagrams/README.md): project status and process diagrams.
- `.scratch/module-1-website/`: the M0 spec and its issues, each with a `Status:` line.

## Legacy (Phase 0)

The original plan rented every capability from free-tier tools (Webflow, HubSpot, Make). Module 1 replaces it (ADR-0002). Those docs are kept for reference, each marked LEGACY:

- [`docs/README.md`](docs/README.md) and `docs/01`–`06`, with the appendices.
- [`templates/`](templates/README.md): the Phase 0 template kit. Some parts are reused by Module 1, such as the UTM taxonomy and the event list.
