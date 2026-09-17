# Looker Studio master report spec

Build once, then per client: File > Make a copy, replace the three data sources.

## Data sources

| Source | Connector | Used for |
|---|---|---|
| GA4 property | Google Analytics | sessions, users, `generate_lead`, channel, campaign, landing page |
| Search Console (URL + site impression) | Search Console | clicks, impressions, average position, queries, pages |
| `<slug>-leads-log` tabs `leads` and `spend` | Google Sheets | lead-level source, stage, score, amount; monthly spend |

Blend (Sheets `leads` × `spend` on `utm_campaign_first` = `utm_campaign` and month) for cost per lead.

## Pages

1. **Overview (this month vs last)**: sessions, `generate_lead` count (GA4), leads (Sheet), deals Qualified+, Won amount, organic clicks. Scorecards with comparison. One line of fixed text: "GA4 counts consented browser sessions; the leads table counts every form. The two differ by design."
2. **Traffic**: sessions by default channel group (plus custom `Agency channels`), by landing page, by device. Time series 90 days.
3. **Campaigns**: table by `utm_campaign` with sessions and `generate_lead` (GA4), leads and Qualified+ (Sheet), spend and cost per lead (blend).
4. **Leads and pipeline**: table of leads (last 30 days) with ts, name, form_type, lead_source_detail, deal_stage, lead_score; stage funnel bar chart; lost reasons pie.
5. **SEO**: Search Console clicks and impressions trend, top 20 queries, top 20 pages, pages with position 5-15 (quick wins).
6. **Nurture**: (from Sheet) leads by `unsubscribed_at` empty vs not, average lead_score by source; note that opens/clicks live in Brevo.

## Filters and controls

Date range control (default last 30 days), `form_type` dropdown, `utm_source_first` dropdown.

## Monthly review agenda (30 minutes, page order)

Overview → Campaigns (kill or scale) → Leads (are deals moving?) → SEO (which page to improve this month) → actions logged in the client's Slack channel.
