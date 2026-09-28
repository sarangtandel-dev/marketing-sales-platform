# Let people edit site content without a developer

Status: ready-for-human
Source: audit research, 2026-09-28

## Problem

Every copy change goes through a developer editing JSON and YAML (the site definition, Facts).

## To decide

Compare **Keystatic** and **Decap CMS** (both git-based, MIT) for editing the site definition text and Facts through pull requests, keeping the validators and the Fact gate (ADR-0007) in the loop. Change requests (ADR-0035) should still get a preview and an approval.

**M1**.
