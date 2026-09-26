# 32: Facts file schema and validation

**What to build:** Client #0 gets a facts file in which each Fact has a stable ID, a language-keyed value, a Source and a Verification Status. It's checked by JSON Schema in CI, so every claim on the site can be traced to something we can prove (ADR-0007 M0, ADR-0024 subset).

**Blocked by:** 20

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The schema requires `id`, `value` (language-keyed), `source` (type, who, URL or document reference, date) and `status` (one of the five Verification Statuses), with `refresh_by` optional
- [ ] CI validates the facts file, and a Fact missing a Source or Verification Status fails
- [ ] Fact IDs must be unique
- [ ] A Client #0 skeleton facts file exists with example entries for the business, offerings and contact points, for the team to fill in
- [ ] A note says no personal data beyond business roles goes in the file
