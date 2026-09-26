# 21: Tracer: site definition → built preview site

**What to build:** A team member writes a minimal site definition, pushes a branch, and gets a Cloudflare Pages preview URL showing a one-page site. That page is built with Astro + Tailwind from the site definition and a Theme token file. This proves the whole path from site definition to deployment.

**Blocked by:** 20

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] The minimal site definition schema covers: meta (schema version, Client slug, Theme reference, default language, languages, version), pages, sections (component, Section Variant, language-keyed text, CTA references), CTAs, forms, navigation, footer, tracking IDs and optional redirects (spec; ADR-0034 minimal subset)
- [x] The Theme token format is defined: colours, type, spacing, radius, shadows
- [x] An invalid site definition fails the build with a message naming the path and the rule broken
- [x] A declared language missing any text key fails the build (ADR-0004)
- [x] The build outputs the page, a 404 page, `sitemap.xml` and `robots.txt`. Production output is never noindex
- [ ] A branch push creates a Pages preview, and the preview responds with `X-Robots-Tag: noindex`
- [x] Seam 1 tests cover the rules above with fixture site definitions

## Comments

2026-09-27: built. The only thing left is a live preview, which needs the Cloudflare setup in `docs/development.md` ("Deploying").

- **Validation:** JSON Schemas for the site definition and the Theme, plus checks against the component catalogue, references between pages and CTAs, duplicate URLs, language keys, and exactly one `not-found` page. Every error names its JSON path.
- **Build:** runs Astro 7 + Tailwind 4 in a single call to Astro's JavaScript API, with no Astro config file. The site definition reaches the pages through a virtual module. Theme tokens become Tailwind theme variables, so classes like `bg-primary` and `rounded-card` come from the Theme.
- **Output:** pages, `404.html` built from the `not-found` page, a hand-built `sitemap.xml`, and `robots.txt`.
- **Tests:** seam 1 tests run the real build as a separate process. 23 site-builder tests pass (27 in the repo).
- **Browser check:** the fixture site was checked in a browser at 1200px and at 390px (phone width).
- **Deploy:** `Deploy` workflow: wrangler direct upload, only changed Clients, every branch as a preview, production branch `live`. It's skipped until `CLOUDFLARE_API_TOKEN` exists.
- **Client #0:** has a placeholder site definition and Theme. Ticket 33 replaces them; ticket 30 replaces the Theme. `site_url` is the pages.dev URL until the real domain is decided.
- **Not yet there:** there's no favicon, and no `astro check` type-check step in CI.

2026-09-27, review fix: branch deploys now build with `--preview` and post forms to a preview Worker (`PREVIEW_FORM_ENDPOINT`, wrangler env `preview`). Before this, once the Cloudflare secrets existed, previews would have used the production Turnstile widget and the production Worker (independent review #1).
