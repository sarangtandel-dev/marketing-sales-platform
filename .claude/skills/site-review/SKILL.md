---
name: site-review
description: Use when checking a Client's website before a preview goes to the Client, before launch (Gate 2), or when asked to QA, audit or review a built Client site (ADR-0037 step 7).
argument-hint: "<client-slug>"
---

# Site review (QA before Gate 2)

One pass over a Client's built site that ends in a QA report. Run it on a preview before the Client reviews it, and again before launch.

## Steps

Run each check and record pass/fail with evidence. Don't stop at the first failure.

1. **Build and serve:** `pnpm dev clients/<slug>` (site on http://localhost:8788, form Worker on :8787).
2. **Automated checks:**
   ```bash
   pnpm test                                   # includes axe on the fixtures
   node tooling/check-links.ts dist/dev-<slug> # internal links
   pnpm audit:site http://localhost:8788       # Lighthouse budgets on every page
   pnpm check:launch clients/<slug>            # placeholders, Facts, config (before launch)
   ```
3. **In a real browser** (playwright or chrome-devtools-mcp), at 375px and 1280px:
   - no Google/GTM request before consent (the network log)
   - the consent banner opens from the footer's "Cookie settings"
   - a test submission shows the success message and stores a Lead (`pnpm exec wrangler d1 execute LEAD_LOG --local --command "SELECT id, fields FROM leads ORDER BY created_at DESC LIMIT 1"` in `packages/form-worker`)
   - the console has no errors except known placeholders
4. **Design:** run `impeccable audit` and `impeccable critique` on each page, and check the pages against the Theme's handoff (frontend-design).
5. **Content:**
   - every claim on every page matches a publishable Fact (see `/site-copy`)
   - copy reads naturally (humanizer)
   - each page's title, description and H1 match its target in `brief/seo-targets.md`, if one exists
6. **SEO:** before launch, on-page checks from the step above. After launch, `openseo-seo-audit` on the live domain.

## Output: `clients/<slug>/qa/<date>-review.md`

```markdown
# QA review: <Client>, <preview URL or local>, <date>
Result: pass | fail (<n> blocking)

| Check | Result | Evidence |
|---|---|---|

## Blocking (must fix before Gate 2)
## Non-blocking (fix or accept, with reason)
```

Fix what's ours, rerun the failed checks, and update the report. The Client signs off Gate 2 on a report with no blocking items.
