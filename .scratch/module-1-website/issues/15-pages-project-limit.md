# Plan for the limit of 100 Pages projects per account

Status: needs-triage
Source: ADR-0003, 2026-09-17

## Problem

Cloudflare Pages allows 100 projects per account. With one project per Client (ADR-0003), that caps us at about 100 Clients per account, the same ceiling as Turnstile (ADR-0028).

## To decide

- Whether Cloudflare will raise the limit on request (check with Cloudflare).
- Otherwise, how Clients are split across several accounts, including how DNS zones follow them (ADR-0012).
- The trigger point: review at 70 Clients.

2026-09-17, milestones (ADR-0039): DESIGNED. Review at 70 Clients.

2026-09-17, milestones restructured (ADR-0039 now has M0/M1/M2). This supersedes the milestone note above: **DESIGNED.** Review at 70 Clients.
