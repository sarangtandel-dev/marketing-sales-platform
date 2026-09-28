# Decide the analytics tool for M1

Status: ready-for-human
Source: audit research, 2026-09-28

## To decide

GA4 through GTM needs a consent banner and a certified CMP (ADR-0020), and it's heavy. Trial **Cloudflare Web Analytics** (cookieless, no banner needed for it) next to GA4 on Client #0 for a month, and keep **Umami** or **Counterscale** (self-hosted on Cloudflare) in reserve. Write an ADR: what each Client gets, what the reports need, and what consent each needs per Region.

**M1**.
