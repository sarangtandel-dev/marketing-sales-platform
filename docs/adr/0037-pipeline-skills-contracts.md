---
status: accepted
---

# Each pipeline step is a Claude Code skill with fixed inputs, outputs and checkpoints

| # | Skill | Reads | Writes | Human checkpoint |
|---|---|---|---|---|
| 1 | `intake` | Base intake plus the pack's extra questions; the live session | `client.yaml`, `facts/*` (`client-stated`, High-risk Claims flagged), documents to R2, and drafts of `media.yaml`, `listings.yaml`, `dns.yaml` | The person running intake confirms High-risk Claims are flagged and documents are uploaded |
| 2 | `research` | `client.yaml`, `facts/*`, research limits (ADR-0017) | `research/<date>.yaml` (`unverified` findings with URLs, plus competitors) | **Verification:** a person promotes findings to `publicly-verified` or `rejected` |
| 3 | `strategy-brief` | Knowledge base, verified research, Pack Version, Region Overlays | `brief/strategy-brief.md`: positioning, audiences, pages (only those with enough Facts), CTAs, SEO targets, missing Facts | **Gate 1:** our lead and the Client's approver |
| 4 | `site-definition` | Approved brief, knowledge base, pack, overlays, region config | `site/site-definition.json` plus a validation report | A person resolves every flagged claim |
| 5 | `theme` | Claude Design spec | `design/theme.json` plus a contrast report | The Client approves the design direction in Claude Design |
| 6 | `build` | Site definition, Theme, knowledge base, packs, regions, components | Static build, preview URL, build report | None; fails on errors |
| 7 | `qa` | Preview deployment | QA report: events, consent for each Region, a test lead end to end, links, redirects, accessibility, performance, legal page review | **Gate 2:** our QA plus the Client's sign-off |
| 8 | `launch` | Gate 2 approval, `dns.yaml` | Production deployment, cutover log, Search Console submission, listings checklist, monitoring | A person runs DNS changes and the email delivery test |

**Rules:**

- **Refuse to run:** each skill refuses to run if the file it reads from the step before is missing or unapproved.
- **Blocking approvals:** only Gate 1, Gate 2 and Fact verification block progress.
- **QA test leads:** they are marked as tests, and removed from the Lead Log and Brevo after QA.
- **Launch monitoring:**
  - Uptime checks.
  - A **daily automated test form submission**, marked as a test and cleaned up afterwards. We get an alert if it doesn't reach both the Lead Log and Brevo.

## Milestone

M1. Each skill is built **only after its step has been done manually for a real Client at least once**. M0: the daily test form submission with an alert. Uptime checks: see issue 19. See ADR-0039.
