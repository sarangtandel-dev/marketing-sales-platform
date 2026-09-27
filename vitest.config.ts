import { defineConfig } from "vitest/config";

// One project per test seam (see .scratch/module-1-website/spec.md), plus repo tooling.
export default defineConfig({
  test: {
    projects: ["packages/*", "tooling"],
  },
});
