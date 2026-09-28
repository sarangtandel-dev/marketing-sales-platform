---
name: site-seo-plan
description: Use when planning which searches a Client's website pages should target, before writing or rewriting site copy, or when asked for keyword research, an SEO plan or SEO targets for a Client (ADR-0037 step 3, ADR-0027).
argument-hint: "<client-slug>"
---

# Site SEO plan

Turns a Client's verified Facts into one search target per page, with real search data from OpenSEO. The output feeds `/site-copy` and is approved at Gate 1 (ADR-0037).

## Before you start

- **OpenSEO has to be reachable.** Call the `whoami` tool of the `openseo` MCP server.
  - If it's missing, stop and point to `docs/procedures/openseo.md` (issue 51).
  - Never make up search volumes or difficulty.
- **Read the Client's files:**
  - `clients/<slug>/facts.yaml`: what they sell and where; publishable Facts only
  - `clients/<slug>/site/site-definition.json`: the pages that exist
  - `CONTEXT.md`
- **Research limits:** stay inside ADR-0017.

## Steps

1. **Set up the project:** `openseo-seo-project-setup`, with the business and markets taken from the Facts. Use `openseo-local-seo` too if the Client serves a local area.
2. **Research:** `openseo-keyword-research`, seeded from each offering Fact and the Client's audience. Pick the market and language from the site definition's languages and the Client's Region.
3. **Map keywords to pages:** `openseo-keyword-clustering` gives one cluster per existing page. A cluster with no page becomes a *proposed page*, and adding it is the Client's decision at Gate 1.
4. **Competitors:** `openseo-competitor-analysis` only when the Client names competitors, or the clusters are unclear.
5. **Write** `clients/<slug>/brief/seo-targets.md` in the shape below. Commit it with the Status line set to `draft`.

## Output: `clients/<slug>/brief/seo-targets.md`

```markdown
# SEO targets: <Client name>
Status: draft | approved (Gate 1, <approver>, <date>)
Market: <country/region>, <language>

| Page (id) | Primary keyword | Intent | Monthly searches | Secondary keywords | Must answer (FAQ) |
|---|---|---|---|---|---|

## Proposed pages (need Gate 1)
## Not targeting, and why
## Data: OpenSEO project <id>, pulled <date>
```

## Rules

- **Only the Client's real offerings.** Targets come from what the Facts say they do, not from high-volume terms they don't offer.
- **One primary keyword per page.** Two pages never target the same query.
- **The plan contains no claims.** Numbers in it are search data, not claims about the Client.
