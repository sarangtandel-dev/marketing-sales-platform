# 03 — Per-Client Setup Playbook

Run this top to bottom for every new client. Each step has an owner, an estimated time, and an
acceptance check. A step is not done until its check passes. The step estimates add up to 24-32 hours,
so the target for an experienced operator is **3-4 working days** of agency time, with WhatsApp and
Google Business Profile verification running in the background for 1-3 weeks.

Prerequisites on the agency side (done once, not per client): Webflow agency workspace with the
master template, GTM master container export, Make Core account with the router blueprint, Looker
Studio master report, Bitwarden, the UTM builder Sheet template, and this playbook. The source
files for all of these are in [`templates/`](../templates/README.md).

## Step 0 — Accounts, ownership and legal (day 1, runs in parallel with everything)

Owner: agency operator with the client. Time: 2 h plus waiting.

1. Agree the client slug (appendix A) and record it everywhere.
2. Client creates or nominates one Google account and one primary email for all tool sign-ups. Agency never signs up with its own email.
3. Create the Bitwarden collection `<slug>` and start the ownership matrix from appendix A.
4. Submit **Meta Business Manager verification** now if the client will use WhatsApp. Needs a business document (GST certificate or incorporation) and a phone number not currently on the WhatsApp app. This takes 1-3 weeks and blocks step 7's WhatsApp part.
5. Decide the business mailbox: Zoho Mail free (up to 5 users, verify) or Google Workspace. Brevo sends must come from a real mailbox domain.
6. Privacy policy and terms: use the agency template covering GDPR and India DPDP Act 2023, including WhatsApp and email consent language. Publish at `/privacy`.

**Check**: ownership matrix has every row filled, Meta verification shows "In review", privacy policy draft approved by the client.

## Step 1 — Domain and DNS

Owner: agency. Time: 1 h plus propagation.

1. Buy the domain under the client's name: Cloudflare Registrar for `.com`, `.co`, `.net` etc.; Namecheap or GoDaddy for `.in` and `.co.in` (Cloudflare does not sell them).
2. Add the zone to the agency Cloudflare account, change nameservers at the registrar.
3. SSL/TLS mode: **Full (strict)**. Always Use HTTPS: on.
4. Redirect rule: `www` to apex (or the reverse, pick one and stay with it).
5. Email: either MX records for the chosen mailbox provider, or Cloudflare Email Routing forwarding `hello@` to the owner's Gmail until a mailbox exists.
6. Placeholder TXT records: SPF `v=spf1 include:<mailbox-provider> ~all` (Brevo include is added in step 7), DMARC `v=DMARC1; p=none; rua=mailto:dmarc@<agency-domain>`.
7. Short links: create a **proxied** (orange cloud) AAAA record `go` pointing at `100::` so Cloudflare redirect rules can answer on `go.<domain>` (appendix A). Redirect rules only run on proxied records.

**Check**: `dig NS <domain>` shows Cloudflare nameservers; `dig TXT _dmarc.<domain>` returns the DMARC record; `https://go.<domain>/test` returns a Cloudflare response (a 404 is fine). The site itself is not live until step 2.

## Step 2 — Website

Owner: agency designer. Time: 1-1.5 days for a template-based site.

1. Duplicate the agency master template into a new site named `<slug>-site`. Pages: Home, Services (one page per core service), About, Contact, Blog (CMS collection), Thank You, Privacy, 404.
2. Content: client supplies copy and images via the intake form; the agency writes titles and meta descriptions (step 3).
3. Site plan: Premium/CMS if there is a blog, Basic otherwise. Card belongs to the client.
4. Custom domain: add `<domain>` and `www.<domain>` in Webflow, create the DNS records in Cloudflare with proxy **off** (grey cloud), set the apex as default.
5. Site-wide custom code: GTM head snippet in `<head>`, GTM noscript and the persistence snippet (appendix B, section 5) before `</body>`.
6. Every lead form: hidden fields from appendix B section 4, honeypot `hp_company`, reCAPTCHA on, redirect URL `/thank-you?type=<form_type>`, form name matches `form_type`.
6b. Tracking markup: WhatsApp click-to-chat button on every page (sticky on mobile) with `data-track="whatsapp"` and a pre-filled message naming the page; phone numbers as `tel:` links; `data-track="cta"` and `data-cta-id` on every primary button. Without this markup the step 4 events cannot fire.
7. Thank-you page: no navigation index (`noindex`), a clear next step (call, WhatsApp, calendar link).
8. Performance pass: compress images (WebP), lazy-load below the fold, remove unused interactions.

**Check**: Lighthouse mobile scores ≥ 90 for Performance and SEO on Home and one Service page; every form submits and redirects to `/thank-you?type=...`; Webflow form log shows the hidden fields populated.

## Step 3 — SEO on-page and indexing

Owner: agency SEO. Time: half a day.

1. Title and meta description templates per page type, applied in Webflow page settings:
   - Home: `<Brand> | <Primary service> in <City>`
   - Service: `<Service> in <City> | <Brand>`
   - Blog post: `<Post title> | <Brand>`
2. One H1 per page, heading hierarchy checked, image alt text on every content image.
3. Canonical set to self on every page; Webflow does this by default, verify after custom domain.
4. Open Graph title, description and image per page; default OG image in site settings.
5. JSON-LD in page custom code: `Organization` site-wide; `LocalBusiness` (or the specific subtype) on Home with address, phone, opening hours, geo; `Service` on each service page; `FAQPage` where FAQs exist; `Article` on blog posts via CMS fields.
6. Sitemap: Webflow auto-generates `/sitemap.xml`; confirm the thank-you and privacy pages are excluded.
7. Robots: default allow; block `/thank-you`.
8. 301s: if replacing an old site, crawl the old URLs with Screaming Frog first and map every one in Webflow's redirect manager.
9. Search Console: add the domain property under the client's Google account, verify via Cloudflare DNS TXT, submit the sitemap, add the agency as owner. Bing Webmaster: import from Search Console.
10. Google Business Profile: claim or create, fill every field, add the website URL with `?utm_source=gbp&utm_medium=social&utm_campaign=evergreen-gbp` (the evergreen exemption in appendix A), request verification (postcard or video, takes days to weeks), and ask the first five existing customers for reviews once verified.
11. Ahrefs Webmaster Tools: verify the site, run the first audit, fix anything above "warning".

**Check**: Search Console sitemap status "Success"; Rich Results Test passes on Home and one service page; Screaming Frog crawl shows zero 4xx, zero missing titles, zero duplicate titles; Google Business Profile shows verification requested (row 3b in the checklist tracks completion).

## Step 4 — Tracking

Owner: agency operator. Time: 2-3 h.

1. GTM: create container `<slug>-web` under the client's Google account, import the agency master container (tags: GA4 config, GA4 event tags for every event in appendix B, Clarity, HubSpot tracking, CookieYes, the Make intent webhook tag). Fill the GA4 measurement id and Clarity project id now. The HubSpot portal id and Make webhook URL do not exist yet; leave the placeholders, which keep the HubSpot and intent tags paused, and fill them in step 6.
2. GA4: create the property `<slug> - Website`, web data stream, mark `generate_lead` as key event, create the three custom dimensions, link Search Console, set retention to 14 months, add the internal traffic filter. Create the custom channel group `Agency channels` with rules for `utm_medium = whatsapp` and `utm_medium = offline`, which GA4's default grouping leaves Unassigned.
3. Clarity: create the project, take its id into GTM.
4. CookieYes: create the site, choose the GDPR + DPDP banner text, connect Consent Mode v2, paste the CookieYes tag into GTM (fires first).
5. Publish the GTM container.

**Check**: GTM preview on a full walkthrough shows every event from appendix B section 1 except the intent webhook tag, which is enabled in step 6; GA4 DebugView shows `generate_lead` exactly once with `form_type`; Clarity shows a recording within 10 minutes; declining consent leaves no GA4 or Clarity requests in the network tab and the form still submits.

## Step 5 — Lead capture

Owner: agency operator. Time: 1-2 h (forms were built in step 2; this step is the conversion layer).

1. Forms present: contact (Home, Contact), quote or booking (Service pages), newsletter (blog, footer). Each with `form_type` hidden field and the consent checkboxes.
2. Spam: Webflow reCAPTCHA on, honeypot present. Turnstile is not possible without a server; do not attempt it.
3. Confirm the WhatsApp button, `tel:` links and `data-track="cta"` markup from step 2 fire `whatsapp_click`, `phone_click` and `cta_click` in GTM preview.
4. Decide the scheduler: Cal.com if the client wants meeting reminders (instant webhook), HubSpot Meetings otherwise.
5. Calendar link on the thank-you page and the contact page: HubSpot Meetings or Cal.com, embedded or linked.
6. Run the UTM test sequence from appendix B section 10.

**Check**: a test submission from a UTM URL lands in Webflow's form log with every hidden field populated and both consent values recorded; a second submission from a plain URL in the same browser preserves first-touch and shows `(direct)` last-touch.

## Step 6 — CRM, Brevo account and the Make router

Owner: agency operator. Time: 3-4 h.

0. Brevo: client creates the free account and adds the agency user. Create the attributes (appendix B section 8) and the lists (appendix A) now so the router can write to them. Sender authentication and templates come in step 7.
1. HubSpot: client creates the free portal under their email, invites the agency as super admin (2 seats total on free, the second is the client owner). Company name and timezone set.
2. Create exactly the 10 custom properties from appendix B section 7. Do not create any others.
3. Pipeline `Sales` with stages New, Contacted, Qualified, Proposal, Won, Lost; add the `lost_reason` dropdown on deals (this is a deal property, counted separately from contact properties, verify).
4. Install the HubSpot tracking code through GTM (already in the container), confirm the portal id.
5. Google Sheet `<slug>-leads-log` from the template with tabs `leads`, `failed`, `utm-builder`; share with the client (view) and the Make service account (edit).
6. Slack: create `#leads-<slug>` in the client's workspace (or a shared channel from the agency workspace) and an incoming webhook.
7. Make: create folder `<slug>`, import the `router` blueprint (trigger: custom webhook), set connections (HubSpot, Brevo, Sheets, Slack, WhatsApp Cloud), set the client variables (slug, owner email, pipeline id, list ids, Sheet id, Slack webhook). Turn on and copy the webhook URL. Import `stage-sync` (schedule: every 2 h, 09:00-21:00 client time) and `replay-failed` (weekly); on a client-owned free Make account skip `replay-failed`.
8. Webflow: site settings, Integrations, add the form webhook pointing at the router URL. GTM: fill the HubSpot portal id and Make webhook URL variables from step 4, publish.
9. Send a test lead.

**Check**: within 2 minutes of a test submission, the HubSpot contact exists with all 10 properties set, a deal is in New with a task due tomorrow, the Brevo contact is in `<slug>-new-leads`, the Sheet has the row with HubSpot and Brevo ids, and the Slack alert has arrived. Make run history shows no errors. A `whatsapp_click` on the test browser increments `lead_score`. Then send a deliberately broken payload (missing email and phone) and confirm it lands in the `failed` tab with the Slack failure alert.

## Step 7 — Automation

Owner: agency operator. Time: 3-4 h, plus WhatsApp template approval.

1. Brevo sender domain: add Brevo's DKIM and the SPF include in Cloudflare, update DMARC to `p=quarantine` once SPF and DKIM pass for a week.
2. Confirm the attributes and lists from step 6.0 exist.
3. Import the agency email templates and personalise: acknowledgement, nurture 1-5, re-engagement 1-2, meeting reminders 24 h and 1 h, no-show. Replace brand, signature and the calendar link.
4. Build the automations from [04-automation-workflows.md](04-automation-workflows.md): W1 acknowledgement, W3 nurture, W5 re-engagement, W6 reminders. Activate.
5. Brevo webhooks: `opened`, `clicked`, `unsubscribed` to the Make router webhook (W4 scoring and the `unsubscribed_at` Sheet column).
6. WhatsApp (if verified): create templates in Meta Business Manager for acknowledgement, reminder 24 h, reminder 1 h; submit for approval; once approved, enable the WhatsApp branch in the Make router.
7. Newsletter: connect the newsletter form to list `<slug>-newsletter` with a double opt-in confirmation.

**Check**: a test lead receives the acknowledgement email within 5 minutes, is moved by the W1 automation from `<slug>-new-leads` to `<slug>-nurturing`, and Brevo shows it enrolled in W3; changing the test deal to Qualified in HubSpot sets Brevo `DEAL_STAGE` on the next stage-sync run (within 2 h) and W3 shows the contact exited; clicking unsubscribe in the test email removes it from every list and writes `unsubscribed_at` on the Sheet row within a minute.

## Step 8 — Reporting and hand-over

Owner: agency operator. Time: 1 h.

1. Copy the Looker Studio master report, point the GA4, Search Console and Sheet sources at the client's, share with the client.
2. Walk the client through: where leads appear (HubSpot mobile app, Slack), how to move deals, where the report lives, what they must never change (GTM, Make, hidden fields).
3. Record the go-live date and the total hours for steps 0-8 in the agency clients sheet; start the 60-day validation clock (doc 02).

**Check**: client can open HubSpot on their phone and sees the test lead; report loads with today's data; onboarding checklist below is fully ticked.

## Onboarding checklist

| # | Step | Owner | Done |
|---|---|---|---|
| 0.1 | Slug agreed, Bitwarden collection created | agency | ☐ |
| 0.2 | Client Google account + primary email in hand | client | ☐ |
| 0.3 | Meta Business verification submitted | client | ☐ |
| 0.4 | Mailbox decided and created | client | ☐ |
| 0.5 | Privacy policy published | agency | ☐ |
| 1 | Domain on Cloudflare, SSL strict, DMARC present | agency | ☐ |
| 2 | Site live on custom domain, Lighthouse ≥ 90 | agency | ☐ |
| 3 | Sitemap accepted, rich results pass, GBP verification requested | agency | ☐ |
| 3b | GBP shows Verified, first reviews requested | client + agency | ☐ |
| 4 | GTM published, GA4 key event verified, consent tested | agency | ☐ |
| 5 | Forms tested with UTM sequence | agency | ☐ |
| 6 | Brevo lists ready, Make router live, test lead in HubSpot + Brevo + Sheet + Slack | agency | ☐ |
| 7 | Brevo domain authenticated, W1/W3/W5/W6 active | agency | ☐ |
| 7b | WhatsApp templates approved, branch enabled | client + agency | ☐ |
| 8 | Looker report shared, client trained, go-live date logged | agency | ☐ |

## Definition of live

A client is live when: a real visitor can submit any form and, within 5 minutes, the owner is alerted, the contact exists in HubSpot with attribution, the acknowledgement email has been sent, and the lead is in the Sheet. Everything else is optimisation.
