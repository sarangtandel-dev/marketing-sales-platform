# Spec: M0 — Client #0 live and capturing real Leads safely

Status: ready-for-agent
Source: `/to-spec`, 2026-09-27. Scope is ADR-0039's M0. Its decisions come from ADR-0001–0039 and issue 19.

## Problem Statement

We sell a growth system that builds websites, captures Leads and runs marketing for Clients. Our own agency has no site built the way the platform will work, and no paying Client yet.

The earlier plan put 10–15 weeks of pipeline machinery before anything went live. We need our own site (Client #0) live in 2–3 weeks, capturing real Leads without losing any, and following the same rules we'll promise paying Clients:

- nothing published that isn't backed by a Fact
- no personal data in the browser or GA4
- tracking only after Consent
- every Lead stored before we say "thanks"

The Phase 0 attribution snippet we'd otherwise reuse breaks several of those rules (issues 01–05, 07).

## Solution

M0 builds the smallest real version of the platform and runs Client #0 through it by hand:

- **Site definition:** a hand-written site definition, validated by a minimal JSON Schema, describes our site's pages, sections, Section Variants, CTAs and forms. All Visitor-facing text is keyed by language.
- **Build:** an Astro + Tailwind build turns the site definition and a Theme into a static site on Cloudflare Pages.
- **Components:** a small shared component library (target 6–8 components, each with Section Variants) is styled only by Theme tokens.
- **Theme:** the Theme is exported by hand from Claude Design unless the `/design-sync` test (issue 12) has passed.
- **Form Worker:**
  - runs spam checks, then writes every Lead to a D1 Lead Log
  - only then tells the Visitor it worked
  - delivers the Lead to Brevo with retries and an idempotent lead ID
  - alerts the owner by email without depending on Brevo
  - deletes Lead Log entries after 90 days
- **Tracking:** a rewritten tracking script keeps personal data out of the browser, waits for Consent, records last non-direct touch and is the only event source for GTM.
- **Consent:** an off-the-shelf consent tool asks every Visitor to opt in, with Google Consent Mode in basic mode.
- **Facts:** every claim on the site is checked by a person against a Client #0 facts file before launch.
- **Monitoring:** a daily test Lead proves the Lead path works, and an external monitor watches uptime.

## User Stories

### Visitor

1. As a Visitor, I want the site to load fast on a phone, so that I can read about the agency without waiting.
2. As a Visitor, I want to see a consent banner before any non-essential tag runs, so that I'm not tracked without agreeing.
3. As a Visitor, I want "Reject all" to be as easy to choose as "Accept all", so that refusing tracking isn't a chore.
4. As a Visitor, I want to change my Consent choice later, so that I can withdraw it.
5. As a Visitor, I want the site to work fully when I reject tracking, so that refusing costs me nothing.
6. As a Visitor, I want to request a consultation through a short form, so that I can start a conversation with the agency.
7. As a Visitor, I want an alternative to the main CTA on every page (at least a link to the form page), so that I can always reach the agency.
8. As a Visitor, I want the email marketing checkbox to start unticked, so that I'm only added to marketing if I choose to be.
9. As a Visitor, I want a privacy notice link next to the submit button, so that I know how my details are used before I send them.
10. As a Visitor, I want to see a success message only once my enquiry is actually saved, so that "thank you" means something.
11. As a Visitor, I want a clear error and a way to retry if my submission fails, so that I don't think I've been heard when I haven't.
12. As a Visitor, I want to submit without solving a visible puzzle in most cases, so that the form isn't a chore.
13. As a Visitor, I want a helpful 404 page, so that a broken link doesn't leave me stranded.
14. As a Visitor who submits the form twice by accident, I want the agency to receive one enquiry, so that I'm not treated as two Leads.

### Lead

15. As a Lead, I want my contact details never stored in my browser, so that a shared or public device doesn't expose them.
16. As a Lead, I want my contact details never sent to GA4 or ad tags, so that analytics tools don't hold my personal data.
17. As a Lead, I want my marketing choice recorded with the exact wording I saw, so that the agency can prove what I agreed to.
18. As a Lead, I want my raw submission deleted from the agency's short-term log after 90 days, so that it isn't kept longer than needed.

### Agency owner (Client #0 approver)

19. As the owner, I want an email alert for every new Lead, even when Brevo is down, so that no enquiry goes unanswered.
20. As the owner, I want every Lead to reach Brevo, so that Brevo stays the lasting record.
21. As the owner, I want Brevo delivery retried with backoff when it fails, so that a short Brevo outage doesn't lose Leads.
22. As the owner, I want an alert when Brevo delivery has failed for the last time, so that I can re-enter the Lead by hand.
23. As the owner, I want retries never to create duplicate Leads in Brevo, so that my CRM stays clean.
24. As the owner, I want each Lead to arrive with its first and last touch, click IDs and landing page, so that I know which marketing brought it.
25. As the owner, I want spam rejected before it reaches the Lead Log or Brevo, so that I don't waste time on bots.
26. As the owner, I want a count of rejected spam, so that I can tell whether the spam checks are working, without storing spam content.
27. As the owner, I want GA4 to record consultation requests as conversions once the Worker has confirmed them, so that conversion numbers aren't inflated by failed submissions.
28. As the owner, I want phone, WhatsApp, SMS and email clicks reported as one event with a channel, so that I can compare channels.
29. As the owner, I want returning organic, social and referral visits credited correctly, so that last touch isn't wrongly marked "direct".
30. As the owner, I want every major ad platform's click ID captured, so that paid campaigns can be attributed.
31. As the owner, I want an alert within a day if the Lead path breaks, so that I don't lose Leads for weeks without noticing.
32. As the owner, I want an alert when the site or the form endpoint goes down, so that I can act quickly.
33. As the owner, I want to roll back to the previous deployment in one step, so that a bad release can be undone quickly.

### Agency team (building and operating the site)

34. As a team member, I want to describe the site in one site definition file, so that the site is built the way paying Clients' sites will be.
35. As a team member, I want the build to reject a site definition that breaks the schema, with a message naming the problem, so that mistakes are caught before deploy.
36. As a team member, I want the build to fail when a declared language is missing a text key, so that no page silently shows missing or fallback text.
37. As a team member, I want to choose a Section Variant per section rather than write custom layout, so that the component library stays shared.
38. As a team member, I want the Theme to change colours, type, spacing, radius and shadows without touching components, so that restyling is safe.
39. As a team member, I want every build to produce `sitemap.xml`, `robots.txt` and a 404 page, so that search engines index the site correctly.
40. As a team member, I want preview deployments to be noindex and to use Turnstile test keys, so that previews never leak into search results or use up production widgets.
41. As a team member, I want to push a branch and get a preview URL, so that I can review changes before launch.
42. As a team member, I want forms and CTAs declared in the site definition with their `form_type` and CTA Type, so that tracking and the Lead record always know which form and CTA were used.
43. As a team member, I want GTM, GA4 and consent-tool IDs set in the site definition, so that no ID is hard-coded in components.
44. As a team member, I want a facts file for Client #0 where each Fact has a Source and a Verification Status and is checked by the schema, so that we can prove every claim on the site.
45. As a team member, I want a launch checklist that has me check every claim against the facts file, so that nothing unverified gets published.
46. As a team member, I want the launch checklist to cover alt text, image rights and colour contrast, so that we meet accessibility and rights rules before those checks are automated.
47. As a team member, I want commits and CI blocked when they contain secrets, so that the Brevo, Turnstile and other keys never enter git history.
48. As a team member, I want the tracking script's rules proven by automated tests, so that the Phase 0 bugs can't come back.
49. As a team member, I want the Worker's order of operations (spam checks → Lead Log → reply → Brevo) proven by automated tests, so that a refactor can't start losing Leads.
50. As a team member, I want the daily test Lead marked as a test and cleaned out of the Lead Log and Brevo, so that it never pollutes real data or reporting.
51. As a team member, I want a hand-written `_redirects` file if our current domain has indexed URLs (issue 18), so that we don't lose search traffic at launch.
52. As a team member, I want the consent tool chosen against written criteria, so that the same choice can serve paying Clients in M1.
53. As a team member, I want Client #0's hand-run steps to count as the manual run that M1's build rule requires, so that we don't repeat them for the first paying Client.

### Reviewer and compliance

54. As the privacy reviewer, I want the privacy policy to name every processor actually used (Cloudflare, Brevo, the consent tool, Google), the 90-day Lead Log retention and the data request contact, so that the policy matches what the site really does.
55. As the privacy reviewer, I want the site blocked from launch until a qualified person has reviewed the privacy policy, so that we don't go live with an unchecked policy.
56. As an auditor, I want every stored marketing opt-in to carry its wording version, timestamp, page URL and form ID in both the Lead Log and Brevo, so that each Consent can be proven later.

## Implementation Decisions

### Modules

**Site definition schema (minimal)**

- It covers:
  - `meta`: schema version, Client slug, Theme reference, default language, language list, site definition version
  - `pages[]`: id, page type, slug per language, SEO title and description per language, `sections[]`
  - `sections[]`: component, Section Variant, text keyed by language, CTA references
  - `ctas[]`: CTA Type, channel, target, fallback
  - `forms[]`: `form_type`, fields, opt-ins shown, Worker endpoint, success behaviour
  - navigation and footer
  - tracking IDs: GTM, GA4, consent tool
  - an optional `redirects[]`
- It does **not** have Fact references, Media references, a Pack Version or generated legal pages. Those are M1 (ADR-0034).
- Every declared language must have every text key, or the build fails. English is the only language in M0 (ADR-0004).

**Facts file schema (minimal)**

- Each Fact has:
  - a stable `id` that is never reused
  - a `value`, with text keyed by language
  - a `source`: its type, who, URL or document reference, and date
  - a `status`, one of the five Verification Statuses
  - an optional `refresh_by`
- The file is checked by JSON Schema only. The site definition doesn't reference it in M0.
- It can hold no personal data beyond business roles (ADR-0016, ADR-0017).

**Theme**

- A token file: colours, type, spacing, radius, shadows. Components read only tokens.
- It comes from Claude Design, exported by hand unless issue 12 has passed.

**Component library**

- Target 6–8 shared section components with Section Variants, enough for the professional/B2B page shapes Client #0 needs (ADR-0033): home, services, about, contact, privacy policy and 404.
- Every page has a form-based fallback CTA (ADR-0023).
- CTA and form components are the **only** place tracking events are pushed from (ADR-0022).

**Site build**

- Reads the site definition, Theme and components, and writes a static site with a 404 page, `sitemap.xml` and `robots.txt`.
- Validation failures stop the build with messages naming the path and the rule broken.
- Production is never noindex. Preview deployments rely on Cloudflare's default `X-Robots-Tag: noindex` for previews (ADR-0034, ADR-0039).
- The environment decides which Turnstile keys are used: test keys on preview, the production widget on production (ADR-0028).

**Form Worker**, one HTTP endpoint for form submissions plus scheduled jobs. Order per ADR-0013:

1. **Spam checks:**
   - Reject a filled honeypot and a failed server-side Turnstile check.
   - Increment a spam counter (a daily count only, no content).
   - Return a generic error.
2. **Store first:**
   - Generate a lead ID, the idempotency key (ADR-0036).
   - Write the raw submission to the D1 Lead Log.
   - A resubmission with the same client-side submission token maps to the existing lead ID instead of creating a new row.
3. **Reply:**
   - Return success only after the Lead Log write commits.
   - If the write fails, return an error so the Visitor can retry.
4. **After the reply:**
   - Send the owner alert through Cloudflare Email Routing's send-email binding to a verified destination address.
   - Make the first Brevo delivery attempt.
   - Record each result on the Lead Log row.
5. **Retries:** a scheduled job retries Brevo delivery with backoff for rows whose delivery is pending or failed.
   - After the final attempt it sends a "delivery failed" alert through the same email binding.
   - Lead data never goes into KV or Queues (ADR-0013).
6. **Purge:** a scheduled job deletes Lead Log rows older than 90 days, and deletes test rows once the monitoring check has read them.

**Lead Log row**

- It follows ADR-0036's Lead record so M1's contract file can formalise it without migration:
  - lead ID, form ID, `form_type`, CTA Type
  - submitted fields
  - Marketing Opt-ins with wording version, timestamp, page URL and form ID (ADR-0021)
  - Consent state
  - first and last touch, click IDs, landing page, referrer and the GA client ID (only when Consent allows)
  - language, page URL, submission time
  - an `is_test` flag
  - delivery status and attempt history
- Location: D1 with a location hint near India (ADR-0029).

**Brevo delivery**

- Maps a Lead to a Brevo contact with an email opt-in attribute and its wording version.
- Delivery is idempotent on the lead ID: a retry updates the same contact and records the same Lead once.
- The Brevo account is ours for Client #0.

**Tracking script** (replaces the Phase 0 snippet; ADR-0022, issues 01–05 and 07)

- **Consent:** writes nothing to storage and pushes nothing personal before Consent. Every Visitor is treated as opt-in in M0.
- **Attribution:** first touch and last non-direct touch are kept for 90 days.
  - Last touch updates on a UTM, a click ID, or an outside referrer, classified as organic, social or referral from a shared domain list.
  - A direct visit never overwrites last touch.
- **Click IDs:** captured from a shared list (`gclid`, `gbraid`, `wbraid`, `msclkid`, `fbclid`, `ttclid`, `li_fat_id`, `twclid`) into both first and last touch.
- **`known_contact`:** a flag with an expiry and no contact details.
- **Events:**
  - `contact_click` with `channel`, and `cta_click` with `cta_type`.
  - `form_start` and `generate_lead` carry `form_type` and form ID from the site definition.
  - `generate_lead` is pushed only when the Worker's success response arrives, not when a thank-you page loads (issue 07).
  - GTM has no click triggers of its own.
- **Handoff to the Worker:** attribution is sent with the form submission, so the Worker can store it.

**Consent and GA4**

- The consent tool loads first.
- Google Consent Mode defaults to denied, in basic mode: Google tags don't load until Consent (ADR-0020).
- GTM listens for the tracking script's events only.
- M0 has no Clarity or ad pixels.

**Consent tool selection criteria** (the tool is chosen at build time against these; no product is named here):

- Certified as a consent management platform for Google Consent Mode v2, and supports basic mode.
- Blocks non-essential scripts until opt-in. "Reject all" is as prominent as "Accept all", and a Visitor can withdraw Consent later.
- Keeps consent records on its side.
- Can later be configured per Region (opt-in or opt-out, Global Privacy Control), so M1 can drive it from region config without switching tools.
- Documented processing locations and a sub-processor list, for M1 DPAs.
- Per-domain pricing that fits a per-Client cost model (ADR-0020). A free tier is acceptable for Client #0.
- Light enough not to noticeably slow the page.

**Secrets scan**

- Runs on pre-commit and in CI, and blocks commits containing credentials or API keys.
- The tool is picked at build time, with these criteria: works offline in pre-commit, has a maintained ruleset, and has an allow-list for test keys (Turnstile's published test keys must not fail the scan).
- Personal-data and binary checks stay in M1 (ADR-0016).

**Monitoring**

- **Daily test Lead:** a scheduled check submits a Lead through the real Worker endpoint once a day.
  - It authenticates with a secret-signed test header in place of a Turnstile token.
  - The Worker accepts that header only on its test path, and marks the row `is_test`.
  - The check confirms the row reached the Lead Log and was delivered to Brevo.
  - It alerts through the email binding if either step fails.
  - It then deletes the test contact from Brevo and the test row from the Lead Log.
  - Test Leads never trigger the normal owner alert.
- **Uptime:** a free external monitor checks the home page and a Worker health route that writes nothing. It alerts by email.

**Standard DNS**

- Our domain uses standard DNS pointed at Cloudflare. The nameserver-cutover checklist is M1 (ADR-0012).
- Cloudflare account hardening applies from M0: 2FA for every member, least-privilege roles, scoped API tokens, and audit logs on.

**Redirects**

- Only if issue 18 finds indexed URLs: a hand-written `_redirects` file with 301s to the best matching new pages.

### Launch checklist (manual, blocking; Gate 2 for Client #0 with our team as approver)

- Every claim on the site matches a Fact in the facts file whose status makes it publishable. High-risk Claims (ADR-0007) need `publicly-verified` or `document-verified`. There are no superlatives without a third-party Source.
- Any hand-written JSON-LD follows issue 06's rules. M0 has no derived structured data.
- Every image has alt text and recorded rights. There are no AI images showing real people, premises or work (ADR-0018).
- The Theme's colour pairs pass WCAG AA contrast.
- A qualified person has reviewed the privacy policy.
- A test Lead has gone end to end on the preview deployment, with events and the Consent banner checked.
- Search Console submission done, the uptime monitor on, and the daily test Lead running.

### Client #0 and M1's build rule

The site definition, Theme, build, QA and launch done by hand here count as the manual run for M1's skills (issue 19 #7). Intake, research and the strategy brief do not.

## Testing Decisions

**What makes a good test:**

- It drives a module from its outer boundary and asserts only what can be observed there: files written, HTTP responses, rows stored, calls made, storage contents, dataLayer pushes.
- It never asserts private helpers or internal call order, **except** where the order *is* the contract: the Worker's "Lead Log write before success response".
- It uses real Turnstile test keys and a local D1. Brevo and the email binding are faked at their HTTP or binding boundary.

**Seam 1: site build.**

- Input: fixture site definitions, facts files and Themes. Output: the built site and validation errors.
- It proves:
  - the schemas reject bad input with named paths
  - a missing language key fails the build
  - every page, the 404 page, `sitemap.xml` and `robots.txt` exist
  - production output isn't noindex
  - forms carry `form_type` and form ID
  - CTAs carry their CTA Type
  - no component hard-codes a tracking ID
  - the facts file schema rejects a Fact missing a Source or Verification Status

**Seam 2: form Worker over HTTP.**

- Input: requests to the endpoint, plus scheduled-job triggers.
- Output:
  - the HTTP response
  - Lead Log rows
  - calls to the faked Brevo and the faked email binding
- It proves:
  - honeypot and failed Turnstile are rejected, counted, and never stored
  - success is returned only after the Lead Log write, and an error is returned when the write fails
  - the same submission token maps to the same lead ID
  - Brevo failures are retried with backoff, and the final failure alerts
  - retries never create a second Brevo record
  - the owner alert is sent when Brevo is down
  - opt-ins are stored with wording version, timestamp, page URL and form ID
  - rows older than 90 days are purged
  - the signed test path marks rows `is_test`, skips the owner alert, and is rejected without a valid signature

**Seam 3: tracking script in a browser page.**

- Input: URL, referrer, Consent state, clicks and form events.
- Output: storage contents and dataLayer pushes.
- It proves every issue 14 rule:
  - nothing is stored before Consent
  - last non-direct touch behaves as specified
  - referrers are classified
  - every click ID lands in first and last touch
  - stored attribution expires after 90 days
  - no email, phone or name ever reaches storage or the dataLayer
  - one click produces exactly one `contact_click` with the right `channel`
  - `generate_lead` fires only on the Worker's success response

**Smoke test: the daily test Lead on the live site.** It reuses the monitoring check. The same check is run by hand on the preview deployment before launch.

**Prior art:** there are no automated tests in the repo. The Phase 0 manual checklist (`docs/appendix-b-tracking-spec.md` §10) and the Phase 0 attribution snippet under `templates/` describe the old behaviour. Treat them as a list of bugs to prove fixed, not a design to copy. The test runner and browser driver are chosen at build time.

## Out of Scope

**M1** (triggered by the first paying Client; ADR-0039):

- Fact references in the site definition, build-enforced publishing rules, the meaning check and the claim check
- the manual Fact expiry command
- the full knowledge base layout, R2 storage, and personal-data and binary commit checks
- Category Pack format and Pack Versions, with the professional/B2B pack formalised from Client #0
- the first paying Client's pack, Region and any Region Overlay
- region config and Privacy Law Profiles, and region-driven Consent behaviour
- generated legal pages, the accessibility statement, and derived structured data
- the eight pipeline skills, each built only after its step has been done by hand for a real Client
- the combined Module 2 contract file
- `changes.yaml`, version tags and the Client approval flow
- the DPA and sub-processor list, and the nameserver default with the cutover checklist
- `/design-sync` and the automated contrast and media checks
- Redirect Map enforcement

**M2:**

- remaining packs and Regions (dental, urgent home services, GB, US, US-CA) not pulled into M1
- the scheduled Fact rebuild job
- screenshot comparison across Clients
- the `call` business-hours rule
- the local listings audit
- location and area pages

**DESIGNED ONLY:**

- more than 100 Clients per account
- a second published language
- the client exit handover
- the www-CNAME fallback
- the EU jurisdiction path for the Lead Log
- SMS, WhatsApp and double opt-in
- the `purchase` CTA
- the pack upgrade workflow
- scheduled research refresh
- listing APIs
- dynamic number swapping
- split contract files and the signed Module 2 webhook

**Not in M0 at all:** a blog, Clarity or ad pixels, an admin UI for the Lead Log, and any Module 2 CRM sync.

## Further Notes

- **Open issues that still touch M0:**
  - **Issue 12:** the `/design-sync` test is optional for M0. If it hasn't run, the Theme is exported by hand.
  - **Issue 18:** indexed URLs on our current domain decide whether `_redirects` is needed.
  - **Issue 15:** the Pages project limit. It needs triage but doesn't block M0.
  - **Issues 08–10:** these rewrite Phase 0 docs and templates. They can run alongside M0 and don't block it.
- **Daily test path:** the signed test header is a new decision made in this spec. It lets the monitoring check get past Turnstile without weakening it for Visitors. If the review prefers a different test path, change it here before build issues are cut.
- **Where the owner alert goes:** the send-email binding delivers only to verified destination addresses, so the owner's address must be verified in Email Routing before launch.
- **Keeping the diagrams current:** `docs/diagrams/project-status` and `m0-system` show this scope. Regenerate them when the spec or issue statuses change (see `docs/diagrams/README.md`).
- **Next step:** break this spec into vertical-slice build issues (`/to-tickets`).
