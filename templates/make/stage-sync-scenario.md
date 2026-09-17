# Make scenario: `<slug> · stage-sync`

**Schedule**: every 2 hours between 09:00 and 21:00 in the client's timezone (Make scheduling:
interval 120 min, advanced: time restriction). About 180 runs per month, 2-3 credits per run.

**Purpose**: HubSpot Free cannot push events, so this scenario polls it and copies what changed
into Brevo (so automations can exit) and the Sheet (so reports are current).

## Module map

| # | Module | Settings |
|---|---|---|
| 1 | HubSpot CRM > Search for deals | filter `hs_lastmodifieddate` > now − 130 min (a little more than the interval so nothing is missed). Properties: dealstage, amount, closed_lost_reason, associated contact id. |
| 2 | Iterator | over deals |
| 3 | HubSpot CRM > Get a contact | by associated contact id, property email |
| 4 | Brevo > Update a contact | `DEAL_STAGE` = stage label (New, Contacted, Qualified, Proposal, Won, Lost) |
| 5 | Google Sheets > Search rows | by `hubspot_deal_id` → Update `deal_stage`, `amount`, `lost_reason` |
| 6 | HubSpot CRM > Search engagements (meetings) | created or modified in the last 130 min |
| 7 | Iterator + Get contact | |
| 8 | Brevo > Update a contact | `MEETING_AT` = start time, `MEETING_OUTCOME` = outcome if set (`completed`, `no_show`, `rescheduled`, `canceled`) |
| 9 | Filter `MEETING_OUTCOME = no_show` → HubSpot create task "Re-book <name>" due +2 h | |

## Weekly branch (Sunday 09:00, same scenario via a second schedule or a small third scenario if credits allow)

| # | Module | Settings |
|---|---|---|
| W1 | HubSpot > Search deals | stage in (New, Contacted) AND `hs_lastmodifieddate` < now − 44 days |
| W2 | HubSpot > Update deal | stage Lost, `closed_lost_reason` = unresponsive |
| W3 | Brevo > Update contact | `DEAL_STAGE` = Lost; remove from `<slug>-nurturing`, add to `<slug>-cold` |
| W4 | Sheet update | `deal_stage`, `lost_reason` |

## replay-failed (weekly, agency Core plan only)

Google Sheets > Search rows on the `failed` tab where `replayed_at` is empty → HTTP > Make a request
POST the stored payload to the router URL → Update `replayed_at`. On a client-owned free Make
account this scenario is skipped and the agency replays by hand from the `failed` tab.
