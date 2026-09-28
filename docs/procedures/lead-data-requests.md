# Lead data requests: export or delete one person's data

When a person asks to see or delete the data we hold about them (ADR-0011, ADR-0013). For Client #0 we are the controller. For a paying Client, we act on the Client's instruction under the DPA (M1).

Confirm it's really them before sending or deleting anything: reply to the address they gave, not to a new one.

## Where their data is

| Place | What | Kept for |
|---|---|---|
| Lead Log (D1) | Each enquiry as submitted, with attribution, consent state and delivery history | 90 days, then purged daily |
| D1 Time Travel | Earlier states of the Lead Log, including deleted rows | 30 days (7 on the Free plan), then gone |
| Brevo | The contact, its attributes, list membership and double opt-in record | Until deleted |
| Owner alert mailbox | The "New enquiry" email (and any "not delivered" email) with every field | As the mailbox keeps it |
| GA4 | Visits linked to their GA client ID, if they accepted analytics | GA4's retention setting |
| Workers Logs | Error details from failed deliveries can quote their email (from Brevo's error text) | A few days (Workers Logs retention), then gone |
| CookieYes | Their consent choices, keyed by a random consent ID, not by name or email | CookieYes's log retention |

## 1. Find their Leads

Run from `packages/form-worker`; drop `--remote` to practise on the local database.

```bash
pnpm exec wrangler d1 execute LEAD_LOG --remote --env="" --json --command \
  "SELECT * FROM leads WHERE json_extract(fields, '$.email') = 'person@example.com'
     OR json_extract(fields, '$.phone') = '+91…'"
```

- Note every `id`.
- Note every `ga_client_id` inside `attribution` (`json_extract(attribution, '$.ga_client_id')`).

## 2. Export (an access request)

Send the person:

- the rows from step 1 (every column)
- their Brevo contact (Brevo → Contacts → the contact → export)
- a plain summary of the other places in the table above, and what's in each

Send it through a channel that confirms it's really them.

## 3. Delete (an erasure request)

1. **The Lead Log:**
   ```bash
   pnpm exec wrangler d1 execute LEAD_LOG --remote --env="" --command "DELETE FROM leads WHERE id IN ('<id>', '<id>')"
   ```
2. **Brevo:** delete the contact.
3. **The alert mailbox:** search for each Lead ID and the person's email, then delete those alerts, and empty them from the trash.
4. **GA4:** for each `ga_client_id`, use GA4 → Reports → User explorer (or the User Deletion API) to delete that client ID's data.
5. **CookieYes:** nothing links its log to the person. Say so in the reply.
6. **Time Travel:** the deleted rows remain in Time Travel for up to 30 days, then expire. Say so in the reply. If a restore happens in that time, repeat step 1 of this section ([restore-lead-log.md](restore-lead-log.md)).
7. **Confirm:** re-run step 1 of this procedure and check nothing is left.

## 4. Record it

- **Log the request** in the Client's request log: who asked, what they asked for, when, and who did it. Don't copy the person's data into the log itself.
- **Answer within the time the Region's law allows** (ADR-0014: the region config's data request deadline). Under India's DPDP Act and GDPR, don't wait for the 90-day purge to do it for you.
