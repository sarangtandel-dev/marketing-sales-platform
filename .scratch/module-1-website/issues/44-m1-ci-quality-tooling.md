# M1 CI and quality tooling

Status: ready-for-agent
Source: audit research, 2026-09-28

Each item is its own small change; pick them up one at a time.

- **Lighthouse CI** on the preview of each Client: performance, SEO and accessibility budgets.
- **schema-dts** for typed JSON-LD (with ticket 33's structured data).
- **`astro check`** for `.astro` files in `pnpm typecheck` (needs `@astrojs/check`).
- **Type-check the form Worker's tests** (Node plus Workers types without the DOM clash).
- **OSV-Scanner** on the lockfile in CI.
- **actionlint** in CI, once it supports GitHub's `$/` self-repository syntax (rhysd/actionlint#711).
- **OpenSSF Scorecard** action.
- **Biome** for formatting and lint, if style drift becomes a problem.
- **claude-code-action** and **anthropics/claude-code-security-review** on pull requests, once there are collaborators.

**M1**.
