# 32: Facts file schema and validation

**What to build:** Client #0 gets a facts file in which each Fact has a stable ID, a language-keyed value, a Source and a Verification Status. It's checked by JSON Schema in CI, so every claim on the site can be traced to something we can prove (ADR-0007 M0, ADR-0024 subset).

**Blocked by:** 20

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] The schema requires `id`, `value` (language-keyed), `source` (type, who, URL or document reference, date) and `status` (one of the five Verification Statuses), with `refresh_by` optional
- [x] CI validates the facts file, and a Fact missing a Source or Verification Status fails
- [x] Fact IDs must be unique
- [x] A Client #0 skeleton facts file exists with example entries for the business, offerings and contact points, for the team to fill in
- [x] A note says no personal data beyond business roles goes in the file

## Comments

2026-09-27: built.

- **Package:** a new `knowledge-base` package holds the facts schema and validator. M1 grows it into the full Client Knowledge Base.
- **Values:** a value is either language-keyed text or a plain value (number, boolean, or a string such as a phone number).
- **Sources:** the schema requires `who` for a `person` Source, `url` for a `url` Source, and `document` for a `document` Source.
- **CI:** `pnpm test` validates every `clients/*/facts.yaml`, so CI catches a bad edit.
- **Client #0:** its skeleton facts file has five placeholder Facts, all `unverified` and marked "TO FILL", and the file's header comment says what may go in it. The team fills them in during ticket 33.
