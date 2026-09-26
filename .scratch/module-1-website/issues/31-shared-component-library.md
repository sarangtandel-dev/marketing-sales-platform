# 31: Shared component library with Section Variants

**What to build:** The shared library gets the 6–8 section components Client #0's B2B pages need (for example hero, services, proof, about, CTA band, contact form, FAQ, footer), each with Section Variants and styled only by Theme tokens. A sample site definition shows every component and variant (ADR-0019, ADR-0033).

**Blocked by:** 21

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] 6–8 components exist, each with at least one Section Variant, chosen to cover the B2B page shapes in the spec
- [x] Components read only Theme tokens, and swapping the Theme changes the look without code changes
- [x] Every page layout offers a form-based fallback CTA (ADR-0023)
- [x] CTA and form components are the only places that push tracking events (ADR-0022)
- [x] Components render semantic, accessible markup, and images require alt text in the site definition (M0 components take no images yet; Media references with alt text come in M1, ADR-0034)
- [x] A sample site definition renders every component and variant on a preview. Seam 1 tests check that each renders from fixtures

## Comments

2026-09-27: built and checked in a browser at 1280px and at 390px (phone width).

- **8 components:**

  | Component | Section Variants |
  |---|---|
  | `hero` | centered, split |
  | `services` | grid, list |
  | `steps` | numbered |
  | `testimonials` | cards, single |
  | `faq` | accordion (native `<details>`), list |
  | `text` | prose, two-column (about and privacy pages; a blank line starts a paragraph) |
  | `cta-band` | primary, subtle |
  | `contact-form` | stacked |

  A shared `CtaLinks` partial renders CTAs with their `data-cta-type`.
- **The catalogue now drives validation:** each component's text keys (required or optional), item keys, and whether it takes CTAs or a form. Unknown or missing keys fail the build with their path.
  - Sections can have `items`, each with text and an optional page link.
- **ADR-0023:** when a site has forms, every page must offer a way to one. The fixture's CTA now points at the contact page.
- **Headings:** the first section on each page renders the `h1`; later sections use `h2` and their items `h3`. A test checks one `h1` per page and no skipped levels.
- **Theme tokens:** a test scans every component for hard-coded colours, Tailwind palette colours, arbitrary colour values and font families.
- **Showcase fixture:** `test/fixtures/showcase` renders every component in every variant, and a test checks each one is present.
- **Fixed:** the header and footer were 16px out of line with the sections.
- **Images:** none yet. Media references with alt text are M1 (ADR-0034), and M0 has no image components.
