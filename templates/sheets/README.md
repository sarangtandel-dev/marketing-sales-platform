# Sheet templates

Create one Google Sheet per client named `<slug>-leads-log` with three tabs:

| Tab | Source file | Notes |
|---|---|---|
| `leads` | `leads-log-header.csv` | Row 1 only; Make appends rows. Freeze row 1. Data validation on `deal_stage` (New, Contacted, Qualified, Proposal, Won, Lost). |
| `failed` | `failed-header.csv` | Make writes here on errors; `replayed_at` is set by the replay scenario or by hand. |
| `utm-builder` | `utm-builder.csv` | Column G formula builds the URL. Add data validation dropdowns on B (sources) and C (mediums) from appendix A. |

Share: client as Viewer, Make service account as Editor, Looker Studio reads `leads`.

Add a fourth tab `spend` with columns `month, utm_campaign, channel, spend` filled by hand monthly, so the Looker report can compute cost per lead.
