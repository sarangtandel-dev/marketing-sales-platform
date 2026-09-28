# `pnpm brevo:setup`: create a Client's Brevo attributes and list

Status: ready-for-agent
Source: audit C19, 2026-09-28

## Problem

Every Brevo attribute the Worker writes is created by hand (`docs/development.md`). A missing one makes Brevo reject every Lead (the Worker then fails and alerts).

## Task

A script, `pnpm brevo:setup clients/<slug>`, reading the forms manifest: it creates each missing contact attribute (field attributes, `LEAD_ID`, `FORM_ID`, `FORM_TYPE`, `LEAD_RECEIVED_AT`, `PAGE_URL`, the `EMAIL_OPT_IN*` ones) and the marketing list, through Brevo's API with `BREVO_API_KEY` from the environment. Idempotent: running it twice changes nothing. Tested against a fake Brevo like the Worker's.

**M1**.
