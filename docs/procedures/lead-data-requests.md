# Lead data requests: export or delete one Lead

When a person asks to see or delete the data we hold about them (ADR-0011, ADR-0013). For Client #0 we are the controller; for a paying Client we act on the Client's instruction under the DPA (M1).

We hold a Lead's raw submission in the **Lead Log** for at most 90 days; the daily purge deletes it after that. The lasting record is in **Brevo**, which the Client owns.

## 1. Find the Lead

Search by the email address the person gave. Run from `packages/form-worker`; drop `--remote` to practise on the local database.

```bash
pnpm exec wrangler d1 execute LEAD_LOG --remote --json --command \
  "SELECT id, created_at, form_id, fields, opt_ins, delivery_status FROM leads WHERE json_extract(fields, '$.email') = 'person@example.com'"
```

Also search by phone (`'$.phone'`) if they gave one. Note every matching `id`.

## 2. Export (an access request)

Save the rows from step 1 as the export, and add the person's Brevo contact (Brevo → Contacts → the contact → export). Send both to the person through a channel that confirms it's really them.

## 3. Delete (an erasure request)

```bash
pnpm exec wrangler d1 execute LEAD_LOG --remote --command "DELETE FROM leads WHERE id IN ('<id>', '<id>')"
```

Then delete the contact in Brevo. Re-run step 1 to confirm nothing is left.

## 4. Record it

Log the request (who, what, when, done by whom) in the Client's request log. Don't copy the person's data into the log itself.

Answer within the time the Region's law allows (ADR-0014: the region config's data request deadline). Under India's DPDP Act and GDPR, don't wait for the 90-day purge to do it for you.
