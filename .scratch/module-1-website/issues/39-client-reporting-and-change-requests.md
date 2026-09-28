# Client-facing alerts, Lead reports, SLA and change requests

Status: ready-for-human
Source: audit C19, 2026-09-28

## Problem

A paying Client gets nothing from us directly: owner alerts go to one address in `wrangler.jsonc`, there's no monthly Lead report, no stated service level, and no way to ask for a change.

## To decide and build

- Alerts to the Client's own address (per Worker, with #37).
- A monthly report: Leads by form, source and day, from the Lead Log and GA4.
- An SLA: response time for incidents and change requests.
- A change-request template (ADR-0035).

**M1**.
