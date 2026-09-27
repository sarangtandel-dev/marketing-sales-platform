# Diagrams

Interactive diagrams of the project's status and processes, generated with [Archify](https://github.com/tt-a1i/archify). Each `.html` file is standalone: open it in a browser to get pan/zoom, search, path tracing, dark/light themes and PNG/SVG export.

The `.json` file next to each diagram is its source. Edit the JSON and regenerate; never edit the HTML directly.

| Diagram | Type | Shows | Sources |
|---|---|---|---|
| [project-status](project-status.html) | workflow | Where the project is: design done, M0 in progress, the M1 and M2 triggers, and issue counts by status | ADR-0039, issue `Status:` lines |
| [end-to-end-flow](end-to-end-flow.html) | workflow | The whole M0 flow in one picture: authoring, build and deploy, the launch gate, consent and tracking, the Lead's journey through the Worker, alerts, retries and monitoring. What's manual and what's for later are marked | ADR-0013, 0020, 0022, 0037, 0038, 0039, `docs/development.md` |
| [m0-system](m0-system.html) | architecture | The M0 system: site, consent and tracking, form Worker, Lead Log, Brevo, owner alert, monitoring | ADR-0002, 0013, 0020, 0022, 0028, 0029, 0039 |
| [lead-capture](lead-capture.html) | sequence | What happens when a Visitor submits a form | ADR-0013, 0021, 0028, 0036 |
| [module-1-pipeline](module-1-pipeline.html) | workflow | The website-creation pipeline for a Client, and which steps are manual or automated | ADR-0005, 0007, 0035, 0037, 0038, 0039 |
| [issue-lifecycle](issue-lifecycle.html) | lifecycle | How an issue moves through the triage statuses | `docs/agents/triage-labels.md`, `docs/agents/issue-tracker.md` |

Last generated: 2026-09-27.

## Keeping them current

Archify draws diagrams; it doesn't read the repo live. Status is written into the JSON, so:

- **Regenerate `project-status`** whenever an issue's `Status:` line or ADR-0039 changes.
- **Regenerate the others** when one of their source ADRs changes.

To regenerate, ask the agent to use the `archify` skill to update the JSON, then run:

```bash
node ~/.claude/skills/archify/bin/archify.mjs validate <type> docs/diagrams/<name>.<type>.json --quality showcase --json
node ~/.claude/skills/archify/bin/archify.mjs deliver <type> docs/diagrams/<name>.<type>.json docs/diagrams/<name>.html --quality showcase --json
```

Update the "Last generated" date above.
