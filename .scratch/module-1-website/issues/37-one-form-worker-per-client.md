# Decide: one form Worker per Client

Status: ready-for-human
Source: audit C17 (×4), 2026-09-28

## Problem

The form Worker serves one Client: one `CLIENT_SLUG`, one Lead Log, one alert address, one Brevo key, one forms manifest. A second Client can't be added without a decision.

## Recommended

A new ADR choosing **one Worker per Client**: a wrangler environment per slug, each with its own D1 Lead Log (ADR-0029 location), secrets, alert address, forms manifest, heartbeat and daily check. The `client` column already exists (migration 0004).

## To decide

- One Worker per Client (above), or one Worker routing by host to per-Client bindings.
- Account limits: Workers scripts, D1 databases and Email Routing destinations per account (see issue 15 for Pages).
- How `pnpm forms:manifest`, the launch check and `release-worker.md` take a Client slug.

**M1**: blocks the first paying Client.
