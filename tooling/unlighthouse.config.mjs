// Whole-site Lighthouse audit (pnpm audit:site <url>). Run it against `pnpm dev`
// (http://localhost:8788) or a production site; pages.dev previews are noindex by design,
// so their SEO score is always low. Fails when any page is below a budget.
export default {
  ci: {
    budget: { performance: 90, accessibility: 100, "best-practices": 95, seo: 100 },
    buildStatic: true,
  },
  scanner: { device: "mobile", samples: 1 },
  outputPath: ".unlighthouse",
};
