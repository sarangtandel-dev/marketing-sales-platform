# Switch harden-runner to block mode

Status: ready-for-agent
Source: audit Batch 3, 2026-09-28

## Task

After a few deploys have run with `egress-policy: audit`, read the endpoints harden-runner recorded for the deploy job (the run's summary links to the StepSecurity insights), and switch to `egress-policy: block` with that allow-list (npm registry, Cloudflare API, GitHub). A deploy that then fails on a blocked endpoint shows it in the run.

**M1**.
