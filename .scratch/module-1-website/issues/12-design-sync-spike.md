# Test /design-sync end to end before building on it

Status: ready-for-human
Source: ADR-0019, 2026-09-17

## Task

1. Start `/design-sync` against one shared test design-system project in Claude Design.
2. Push one component preview, read it back, and change one token.
3. Confirm the change round-trips.

`/design-sync` has to be started by a person; an agent can't start it on its own.

## Done when

- The result is recorded in ADR-0019.
- ADR-0019 becomes `accepted`, or switches to the fallback of exporting specs and converting them to tokens by hand.

2026-09-17, milestones (ADR-0039): Milestone M1. This blocks the Theme for Client #0.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: Optional for M0: if it isn't done, the M0 Theme is exported by hand. **Required in M1.**
