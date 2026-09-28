# Generate the site definition types from its JSON Schema

Status: ready-for-agent
Source: audit research, 2026-09-28

## Problem

`SiteDefinition` in `packages/site-builder/src/definition.ts` is written by hand next to the JSON Schema, and the two can drift (the audit found `cookie_settings` needed both).

## Task

Generate the types with **json-schema-to-typescript** (`pnpm schema:types`), check them in, and fail a test when they're stale, like the forms manifest.

**M1**.
