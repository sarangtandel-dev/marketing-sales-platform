---
status: accepted
---

# What is automated and what is manual in version 1

**Automated:**

- schema and meaning validation, claim flagging
- the build and its checks
- the contrast check
- preview deployments
- the Worker: spam checks, Lead Log, Brevo delivery with retries, alerts
- pre-commit and CI checks that block personal data
- uptime checks and the daily test submission
- *(M2)* the scheduled rebuild for changed and expiring Facts
- *(M2)* screenshot comparison for component changes

**A person runs the skill, and Claude drafts:** intake notes, research, the strategy brief, the site definition, the QA report.

**Fully manual:**

- the intake session
- Fact verification
- Claude Design work
- setting up accounts (GA4, GTM, Brevo, consent tool, Turnstile, Pages project)
- DPA signing
- legal page review
- DNS changes
- listings audit
- Change Requests
- **in M1, a Fact expiry check run by hand as a command before every deploy.** The scheduled rebuild job replaces it in M2.

**Not in version 1:** scheduled research refresh, listing APIs, dynamic number swapping, a Module 2 webhook subscriber, automatic Client approvals.

## Milestone

M1. In M0 everything is manual except the build, deploy, Worker and daily test submission. See ADR-0039.
