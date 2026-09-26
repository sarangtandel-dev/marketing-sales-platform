# 21: Tracer: site definition → built preview site

**What to build:** A team member writes a minimal site definition, pushes a branch, and gets a Cloudflare Pages preview URL showing a one-page site. That page is built with Astro + Tailwind from the site definition and a Theme token file. This proves the whole path from site definition to deployment.

**Blocked by:** 20

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The minimal site definition schema covers: meta (schema version, Client slug, Theme reference, default language, languages, version), pages, sections (component, Section Variant, language-keyed text, CTA references), CTAs, forms, navigation, footer, tracking IDs and optional redirects (spec; ADR-0034 minimal subset)
- [ ] The Theme token format is defined: colours, type, spacing, radius, shadows
- [ ] An invalid site definition fails the build with a message naming the path and the rule broken
- [ ] A declared language missing any text key fails the build (ADR-0004)
- [ ] The build outputs the page, a 404 page, `sitemap.xml` and `robots.txt`. Production output is never noindex
- [ ] A branch push creates a Pages preview, and the preview responds with `X-Robots-Tag: noindex`
- [ ] Seam 1 tests cover the rules above with fixture site definitions
