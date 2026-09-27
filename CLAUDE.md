## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix), plus `done` for built and verified issues, recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Diagrams

Project status and process diagrams live in `docs/diagrams/`, generated with the `archify` skill (installed globally at `~/.claude/skills/archify`). Regenerate `project-status` whenever an issue's `Status:` line or ADR-0039 changes, and the others when their source ADRs change. See `docs/diagrams/README.md`.

### Code style: the Ponytail ladder

Adapted from [Ponytail](https://github.com/dietrichgebert/ponytail) (MIT). Before writing code, read the code the change touches and trace the real flow, then stop at the first rung that holds:

1. Does this need to exist at all? If the need is speculative, skip it and say so in one line.
2. Is it already in this codebase? Reuse the helper, type or pattern. Look before you write.
3. Does the standard library (Node, Web platform) do it?
4. Does a native platform feature cover it (HTML, CSS, Astro, Cloudflare)?
5. Does an installed dependency solve it? Never add a dependency for what a few lines can do.
6. Can it be one line?
7. Only then, write the minimum code that works.

- **No speculative structure:** no interface with one implementation, no config for a value that never changes, no scaffolding "for later".
- **Prefer deleting to adding,** and boring to clever.
- **Fix bugs at the root cause:** in the shared function every caller goes through, not in each caller.
- **Mark deliberate shortcuts** with a `ponytail:` comment naming the limit and the upgrade path.

**Never cut** these, because the ADRs require them:
- input validation at trust boundaries
- anything that prevents losing or double-delivering a Lead (Lead Log before the reply, leases, idempotency, retries)
- security and privacy measures (Turnstile, the honeypot, the signed test path, the CORS allow-list, consent gating, stripping personal data)
- accessibility markup
- the test that proves a rule
