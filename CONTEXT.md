# Growth System

A service that builds a Client's website, runs their marketing and supports their sales. All modules share one knowledge base per Client. Module 1 covers website creation.

## Language

### Parties

**Client**:
A business that pays us to run its growth system.
_Avoid_: Customer, account, tenant, business (when meaning the Client)

**Client #0**:
Our own agency, run through the pipeline as a Client so the pipeline is proven before a paying Client depends on it.
_Avoid_: Test client, demo client, internal site

**Customer**:
A person or organisation that buys from a Client.
_Avoid_: Client, end user

**Visitor**:
Anyone browsing a Client's site.
_Avoid_: User, traffic

**Lead**:
A Visitor who has submitted contact details through a Client's site.
_Avoid_: Contact, prospect, enquiry

### Client knowledge

**Client Knowledge Base**:
The single source of truth about one Client. Every module reads from it.
_Avoid_: Client profile, client data, brief

**Fact**:
A single claim about a Client, together with its Source and Verification Status.
_Avoid_: Data point, info

**Source**:
Where a Fact came from: a named person at the Client on a given date, a public URL retrieved on a given date, or a document the Client provided.
_Avoid_: Reference, citation

**Verification Status**:
How far a Fact has been checked: `client-stated`, `publicly-verified`, `document-verified`, `unverified` or `rejected`.
_Avoid_: Confidence, trust level

**Publishable Fact**:
A Fact that may appear on a Client's site because its Verification Status is high enough for its kind and it has not expired.
_Avoid_: Approved fact, live fact

**High-risk Claim**:
A Fact about licences, certifications, awards, years in business, rankings or medical/financial outcomes. The Client's word alone never makes one publishable.
_Avoid_: Sensitive fact, regulated claim

**Time-sensitive Fact**:
A Fact that goes stale, such as a rating, review count, team size or years in business. It carries a confirmed date and a Refresh-by Date.
_Avoid_: Dynamic fact, volatile fact

**Refresh-by Date**:
The date after which a Time-sensitive Fact stops being publishable until someone confirms it again.
_Avoid_: Expiry, TTL

**Testimonial**:
A quoted statement from a named Customer. It is publishable only with a Permission Record or a verifiable public Source.
_Avoid_: Review (unless it comes from a public review platform), quote

**Permission Record**:
Evidence that a named person or organisation agreed to be quoted or shown on a Client's site, whether in a Testimonial, a case study, a client logo or a staff photo.
_Avoid_: Consent (reserved for Visitor privacy choices)

### Site shape

**Category Pack**:
The predefined bundle for one kind of business: its sections, primary CTA, trust signals, schema.org type, intake questions, conversion goals and default Capabilities. Each Client has exactly one.
_Avoid_: Template, vertical, industry preset

**Regulated Pack**:
A Category Pack, or one of its schema.org subtypes, whose industry has advertising rules (dental, legal, financial). A Client on one can't launch in a Served Region without a reviewed Region Overlay.
_Avoid_: Compliance pack, sensitive category

**Region Overlay**:
The rules one Category Pack follows in one Region: added prohibited claims, trust signals switched off, required disclaimers.
_Avoid_: Local rules, market variant

**Capability**:
An optional feature a site can have, such as local presence, service area, booking or multi-location. A Category Pack switches Capabilities on by default, and a Client can override those defaults.
_Avoid_: Feature flag, add-on, module

**Strategy Brief**:
The document, approved by us and the Client, that sets a Client's positioning, audiences, pages and CTA choices before any site is generated.
_Avoid_: Plan, proposal, creative brief

**Site Definition**:
The validated, versioned description of one Client's site: its pages, sections, copy, and references to Facts, Media and CTAs. The site is built from it.
_Avoid_: Site config, sitemap, content file

**Change Request**:
A Client's request to alter a live site, logged with who asked, what they asked for, its status and the approval evidence.
_Avoid_: Ticket, edit request, revision

**CTA Type**:
The generic action a CTA asks for: `call`, `message`, `email`, `book`, `quote_request`, `consultation_request`, `demo_request` or `visit`. The channel is chosen separately.
_Avoid_: Button type, conversion type

**Primary CTA**:
The one CTA Type a Category Pack puts first on every page.
_Avoid_: Main button, hero CTA

**Redirect Map**:
The record of what happens to each indexed URL on a migrating Client's old site: a 301 redirect to a new page, or an explicit decision to drop it.
_Avoid_: Redirect list, URL mapping

**Media Item**:
An image or video used on a Client's site, recorded with its source, rights, any model release, and alt text for each language.
_Avoid_: Asset, photo, image (when meaning the record)

### Pack versions and design

**Pack Version**:
A released version of a Category Pack. Each Client pins one, and moving to another is a reviewed change.
_Avoid_: Pack revision, template version

**Theme**:
A Client's design tokens (colours, type, spacing, radius, shadows) applied to the shared component library.
_Avoid_: Skin, template, brand kit

**Section Variant**:
One of the pre-built layouts that a shared section offers. A Client chooses one; nobody builds a new one for a single Client.
_Avoid_: Custom section, layout override

### Geography

**Region**:
A country (ISO 3166-1), optionally narrowed to a state or province (ISO 3166-2). A Region sets locale formats and legal rules.
_Avoid_: Market, locale, geography

**Home Region**:
The Region where a Client is based. It sets the phone, currency, address and time-zone formats.
_Avoid_: Primary market, country

**Privacy Law Profile**:
The shared description of what one privacy law requires. Regions refer to it; it records who reviewed it and when.
_Avoid_: Compliance config, legal settings

**Served Region**:
A Region whose people a Client serves or markets to. It decides which privacy and consent rules the Client's site must follow.
_Avoid_: Target market, audience region

### Leads and consent

**Consent**:
A Visitor's privacy choice about cookies, tags and tracking in their browser.
_Avoid_: Permission (reserved for Testimonials), opt-in (reserved for marketing)

**Marketing Opt-in**:
A Lead's explicit, per-channel agreement to receive marketing, recorded with the exact version of the wording shown.
_Avoid_: Consent (reserved for Visitor privacy choices), subscription

**Lead Log**:
Our short-term record of every raw form submission, written before delivery to Brevo and deleted automatically after its retention period.
_Avoid_: Lead database, audit sheet, CRM

### Delivery

**Milestone**:
A shippable slice of version 1. M1 is Client #0 live end to end. M2 is the first paying Client, with the remaining packs and Regions.
_Avoid_: Phase (reserved for the Phase 0 rented-tool setup), release

## Relationships

- A **Client** has exactly one **Client Knowledge Base**, one **Category Pack** and one **Home Region**.
- A **Client** has one or more **Served Regions**. The **Home Region** is usually one of them.
- A **Client Knowledge Base** is made of **Facts**, and each **Fact** has one **Source** and one **Verification Status**.
- A **Category Pack** switches some **Capabilities** on by default, and a **Client** can override each default.
- A **Client** pins one **Pack Version** and has one **Theme**.
- A **Site Definition** is generated from an approved **Strategy Brief** and refers to **Facts** by ID. It never copies their values.
- A **Category Pack** has at most one **Region Overlay** per **Region**.
- A **Lead** is written to the **Lead Log** before it reaches the Client's CRM.
- A **Region** refers to one or more **Privacy Law Profiles**.
- A **Visitor** becomes a **Lead** by submitting a form. A **Lead** may later become a **Customer**.

## Example dialogue

> **Dev:** "The research step found the clinic's 4.8 rating on a review site. Can the site show it?"
> **Domain expert:** "It's a **Time-sensitive Fact** with a public **Source**, so it's `publicly-verified` and publishable until its **Refresh-by Date**. After that it's hidden until someone checks it again."
> **Dev:** "And the owner's 'award-winning' line from intake?"
> **Domain expert:** "That's a **High-risk Claim**. `client-stated` isn't enough. We need a public Source or a document before it becomes a **Publishable Fact**."
