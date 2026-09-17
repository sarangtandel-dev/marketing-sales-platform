# Marketing + Sales Growth Platform

An agency-operated growth stack for small businesses: website, SEO, lead capture, CRM and
marketing automation. Phase 0 rents every capability from the best free-tier tool in each slot
and wires them at a single seam. Phase 1 replaces the tools one module at a time, starting with
the seam, once concrete triggers fire.

## Decisions

| Decision | Choice |
|---|---|
| Operator | Agency running the stack for multiple client businesses |
| Phase 0 budget | Under $50/mo per client, floor about $25 |
| Phase 0 philosophy | Best-of-breed free tiers, every tool replaceable in isolation |
| Market | India and global from day one; email is the base channel, WhatsApp and consent configured per client |
| Phase 1 stack | Deferred; criteria in doc 06, decided when triggers fire |
| Scope | Website + SEO + lead generation + marketing automation only |

## Documents

| Doc | What it answers |
|---|---|
| [01-tool-stack.md](01-tool-stack.md) | Which tool fills each slot, why, its limits, what it integrates with, what it costs |
| [02-architecture.md](02-architecture.md) | How the tools connect, the data flow from visitor to automation, the Phase 0 validation gate |
| [03-setup-playbook.md](03-setup-playbook.md) | Step-by-step onboarding of a new client with acceptance checks |
| [04-automation-workflows.md](04-automation-workflows.md) | The six workflows: instant follow-up, UTM tracking, nurture, scoring, re-engagement, meetings |
| [05-limitations.md](05-limitations.md) | Where the rented stack fails, at what numbers, and which Phase 1 module fixes it |
| [06-transition-plan.md](06-transition-plan.md) | When to start building, build order and why, what stays rented, migration procedure |
| [appendix-a-naming-and-utm.md](appendix-a-naming-and-utm.md) | Naming conventions, UTM taxonomy, pipeline stages, account ownership matrix |
| [appendix-b-tracking-spec.md](appendix-b-tracking-spec.md) | dataLayer events, GA4 setup, hidden form fields, HubSpot property budget, Sheet columns |

## Template kit

[`../templates/`](../templates/README.md) holds the agency masters the playbook presupposes: the
Webflow persistence snippet and hidden-field block, JSON-LD, the GTM container export, Make scenario
build specs, Brevo automations and email copy, Sheet headers, the Looker report spec, the privacy
policy template and the client intake form.

## The one-line architecture

```
Visitor → Cloudflare → Webflow → GTM (GA4, Clarity, HubSpot cookie)
        → Webflow form with hidden UTM fields
        → Webflow form webhook → Make router → HubSpot (contact, deal, task) + Brevo (email automation)
                       + WhatsApp Cloud (acknowledgement) + Sheet (log) + Slack (alert)
```

The form submission is the only seam. Phase 1's first module, the Lead Hub API, takes over that
seam and nothing on the client site changes.

## How to use these docs

- Onboarding a client: follow doc 03 top to bottom, with appendices A and B open.
- Building a Make blueprint or Brevo automation: doc 04.
- A client asks for something the stack cannot do: doc 05 says whether it is a plan upgrade or a Phase 1 item.
- Deciding whether to start building: the validation gate in doc 02 and the triggers in doc 06.

## Phase 0 validation gate

Phase 1 planning starts only after all seven metrics in doc 02 hold across three pilot clients
for 60 days: onboarding in 4 working days of agency time, lead to CRM and acknowledgement in 5 minutes, 80% attributed
leads, under $50/mo per client, +50% organic clicks by month 3, two of three clients retained,
under 4 agency hours per client per month.

## Prices and limits

All vendor prices and free-tier limits were researched in September 2026 and are marked
"verify at execution". Check the vendor pricing page before quoting a client.
