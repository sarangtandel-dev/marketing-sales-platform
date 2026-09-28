# Personal data breach

A breach is any access to, or loss or disclosure of, personal data that shouldn't have happened. For example:
- someone outside us reads the Lead Log, the Brevo account or the alert mailbox
- a Cloudflare or Brevo credential leaks
- a Lead's details are sent to the wrong person

When in doubt, treat it as a breach and start here.

[TO FILL: a qualified person confirms the legal steps below during the privacy review (ticket 34), including the DPDP Rules' exact notice contents.]

## 1. Contain (within the hour)

- **Rotate every credential that may be involved** ([rotate-secrets.md](rotate-secrets.md)).
- **Sign out other sessions and check the admins** of the affected accounts ([accounts.md](accounts.md)).
- **Stop the leak itself:** a public link, a forwarded mailbox, a mistaken share.

## 2. Assess (same day)

Write down:
- what data was affected
- whose data, and how many people
- when it started and ended
- how it happened
- whether it's still possible

Use Lead ids, never copies of the data.

## 3. Notify

| Who | When | How |
|---|---|---|
| **Data Protection Board of India** (DPDP Act) | Without delay, then a detailed report within 72 hours | The Board's online process |
| **Each affected person** (DPDP Act) | Without delay | Plain language: what happened, what it means for them, what we did, what they can do, and our contact |
| **EU/UK data protection authority**, if the GDPR applies | Within 72 hours of becoming aware | The authority's form |
| **The Client**, when we act as their processor (M1, a paying Client) | Without undue delay, as the DPA says | Email to the Client's named contact; they notify as controller |

For Client #0, we are the controller and notify directly.

## 4. Record and learn

- **Record it:** facts, decisions and notices sent, with times, in the Client's breach log. Keep the record even if no notice was needed, with the reason.
- **Fix the cause:** a ticket in `.scratch/` with `Status: ready-for-agent` or `ready-for-human`.
