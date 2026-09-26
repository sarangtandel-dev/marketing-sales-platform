# Check whether our agency domain already has indexed URLs

Status: ready-for-agent
Source: ADR-0027, ADR-0039, 2026-09-17

## Task

Find out whether the agency's current domain has a live site with URLs indexed by search engines.

- **If it does:** Client #0 needs a Redirect Map in M1, and the build must enforce it.
- **If it doesn't:** the Redirect Map is M2, with the first migrating paying Client.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **M0.** If indexed URLs exist, M0 ships a hand-written `_redirects` file. Build enforcement is M1.
