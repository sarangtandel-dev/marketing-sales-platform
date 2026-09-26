# 31: Shared component library with Section Variants

**What to build:** The shared library gets the 6–8 section components Client #0's B2B pages need (for example hero, services, proof, about, CTA band, contact form, FAQ, footer), each with Section Variants and styled only by Theme tokens. A sample site definition shows every component and variant (ADR-0019, ADR-0033).

**Blocked by:** 21

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] 6–8 components exist, each with at least one Section Variant, chosen to cover the B2B page shapes in the spec
- [ ] Components read only Theme tokens, and swapping the Theme changes the look without code changes
- [ ] Every page layout offers a form-based fallback CTA (ADR-0023)
- [ ] CTA and form components are the only places that push tracking events (ADR-0022)
- [ ] Components render semantic, accessible markup, and images require alt text in the site definition
- [ ] A sample site definition renders every component and variant on a preview. Seam 1 tests check that each renders from fixtures
