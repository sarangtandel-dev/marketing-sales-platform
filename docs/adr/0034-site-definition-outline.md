---
status: accepted
---

# Outline of the site definition

**What the site definition contains:**

- **`meta`:**
  - schema version, Client slug, Pack Version
  - Theme reference
  - default language and the list of languages
  - site definition version and status
- **`pages[]`:**
  - id, page type, slug per language
  - SEO title and description per language
  - `sections[]`
- **`sections[]`:** component, Section Variant, text keyed by language, Fact references, Media references, CTA references
- **`ctas[]`:** CTA Type, channel, target (a Fact reference), fallback
- **`forms[]`:** `form_type`, fields, which opt-ins it shows, Worker endpoint, what happens on success
- **navigation, footer**
- **generated legal pages**
- **tracking IDs:** GTM, GA4, consent tool
- **`redirects[]`:** the Redirect Map
- **structured data:** derived from Facts and page types; only explicit overrides are written in the site definition

**Languages:** each declared language must have every text key, or the build fails. There is no silent fallback to English.

**Validation:** JSON Schema, plus a meaning check. The meaning check covers:

- whether Fact references exist and are publishable
- the pack's required sections
- the region overlay rules
- the claim check

**Additions:**

- **Indexing:** production pages are never set to noindex (ADR-0027). **Preview deployments are always noindex.**
- **Legal pages:** generated legal pages are filled with the Client's **actual** data practices (processors, retention, channels in use) and reviewed by a person before launch.
- **Standard files:** every site also gets a 404 page, `sitemap.xml`, `robots.txt`, and an accessibility statement.

## Milestone

M0: the minimal subset (pages, sections, variants, CTAs, forms, language-keyed text), plus 404, sitemap and robots. Preview deployments are noindex by Cloudflare default. M1: the full outline (Fact and Media references, meaning check, claim check, generated legal pages, accessibility statement, derived structured data). See ADR-0039.
