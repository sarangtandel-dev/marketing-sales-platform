---
name: site-copy
description: Use when writing, rewriting or filling in the text of a Client's website (hero, services, steps, FAQ, CTA bands, page titles and descriptions), or replacing "[TO FILL]" placeholders in a site definition, especially under pressure to make the site sound established or persuasive (ADR-0007, ADR-0037 step 4).
argument-hint: "<client-slug> [page ids]"
---

# Site copy from publishable Facts

**Every sentence that says something about the Client is a claim, and every claim needs a publishable Fact.** No Fact means a `[TO FILL]` placeholder that the launch check blocks, never a softer invented sentence. This is ADR-0007. Breaking the letter of this rule is breaking its spirit.

## What counts as a claim

Anything a Visitor could hold the Client to:
- what they offer
- how they work (process, testing, support, handover)
- speed and timelines
- results and outcomes
- experience, years, client counts, locations
- prices, guarantees, "no obligation", "free"
- awards, rankings, certifications

Section headings and CTA labels that only name an action ("Book a consultation") aren't claims. The body text around them usually is.

## Which Facts may support a claim (`clients/<slug>/facts.yaml`)

| Fact status | Normal claim | High-risk claim (years in business, licences, certifications, awards, rankings, outcomes, client counts) |
|---|---|---|
| `publicly-verified`, `document-verified` | yes | yes |
| `client-stated` | yes | **no** |
| `unverified`, `rejected` | **no** | **no** |

## Steps

1. **Read** `facts.yaml`, `site/site-definition.json`, and `brief/seo-targets.md` if it exists.
2. **Write** each field for its page's SEO target, using only what the Facts support. Reword freely, but the meaning must stay inside the Fact.
3. **When a field needs a claim no publishable Fact supports,** write `[TO FILL: needs a Fact: <what>]` and list it in the report.
4. **Keep the page's structure** (sections, item counts, CTAs). Can't fill it truthfully? Use placeholders and ask; don't delete items.
5. **Polish:** `copywriting` for clarity and persuasion within the Facts, then `humanizer`. Visitor-facing text never contains an em dash (—): use a full stop, comma or colon instead. No stock AI phrases.
6. **Check:** the build validates the definition; `pnpm check:launch clients/<slug>` lists what's left.

## Output: reply with this table

| Page / field | Text written | Fact ids (status) |
|---|---|---|

Then a **Needs a Fact** list: each placeholder, and the Fact that would fill it.

## Rationalizations: all mean stop and use a placeholder

| Thought | Reality |
|---|---|
| "It's the only credibility point we have" | An unverified High-risk Claim is the exact case ADR-0007 blocks. Placeholder it, and ask for the document. |
| "It's generic process copy, not a claim" | "Support whenever you need it" and "we test every form" are promises. Claim. |
| "The founder said so" | That's `client-stated`: fine for normal claims, never for High-risk ones. |
| "Launch is this week / the page looks empty" | The launch check blocks placeholders anyway. An invented claim only hides the gap. |
| "I'll flag it in my notes" | A flagged claim still ships. Placeholder it. |
| "An em dash matches the house style" | Visitor-facing copy has none. Rewrite the sentence. |

## Red flags

Stop if you're about to write:
- a number
- "years", "trusted by", "leading", "best", "guaranteed", "free", "no obligation"
- a result
- anything about support or aftercare

without a publishable Fact id for it.
