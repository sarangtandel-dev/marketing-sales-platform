# Turnstile's free-tier widget limits cap how many Clients we can serve

Status: ready-for-agent
Source: Cloudflare research, 2026-09-17

## Problem

Turnstile's free tier allows **20 widgets per account** and **10 hostnames per widget**. The "any hostname" widget needs Enterprise. Verifications are unlimited.

Each Client typically uses 2–3 hostnames (apex, `www`, `pages.dev`). That caps us at about 20 Clients if each gets its own widget, or about 60–100 if widgets are shared.

## To decide

- Share widgets across Clients (and accept shared analytics), or give each Client its own.
- The Client count at which we move to Enterprise or add accounts.

2026-09-17: decided in ADR-0028. Widgets are shared, up to 10 hostnames each. Test keys are used outside production.

2026-09-17, milestones (ADR-0039): Milestone M1.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0.** Test keys on preview deployments.

2026-09-27, build: Implemented in ticket 22 (9ca6b82). Preview builds always use Turnstile's test site key. The shared production widget is a site-definition setting (`meta.turnstile_site_key`). Ready to close once the M0 build is reviewed.
