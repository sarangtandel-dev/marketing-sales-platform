# Check Brevo's HIPAA position before any US dental Client

Status: ready-for-agent
Source: ADR-0031, 2026-09-17

## Task

Before onboarding any US dental Client, check Brevo's **current** position on HIPAA and on signing Business Associate Agreements. Record the finding, its date and its sources in ADR-0031.

If Brevo won't sign a BAA, decide which of these applies:

- US dental leads skip Brevo.
- The dental forms keep health information out of submissions well enough that HIPAA doesn't apply. That needs legal review.
- US dental Clients are not onboarded.

Blocks onboarding US dental Clients.

2026-09-17, milestones (ADR-0039): Milestone M2. Only needed before any US dental Client.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M1** if the first paying Client is a US dental clinic, otherwise **M2**.
