---
status: accepted
---

# Client DNS zones live in our Cloudflare account by default; www-CNAME is the fallback

**Default:** the Client keeps its registrar and points its nameservers at our Cloudflare account, so its zone lives with its Pages project. Cloudflare only serves an apex domain on Pages when the zone is in the same account as the project.

**Fallback:** when a Client won't hand over DNS, the site runs on `www.` through a CNAME record at the Client's own DNS provider, and the registrar forwards the apex to `www`.

We rejected registering domains ourselves (ADR-0011).

Accepted on 2026-09-17, after checking whether Cloudflare for SaaS could serve Client apex domains without holding their zones. The finding is recorded below.

## Cloudflare for SaaS finding

Researched 2026-09-17 against developers.cloudflare.com.

**What Cloudflare for SaaS offers:**

- Custom hostnames do **not** require the Client's zone to be in our account.
- The first 100 hostnames are free on the Free, Pro and Business plans; after that each costs $0.10 a month.
- Since May 2025, a custom origin per hostname is available below Enterprise.

**The catch is the apex domain.** The standard setup expects the Client to add a CNAME record, and a bare apex domain can't hold one. Two ways around that:

- **Apex proxying (A records to static IPs):** an **Enterprise-only paid add-on**.
- **CNAME flattening at the Client's own DNS provider:** Cloudflare mentions it, but doesn't document that it works for SaaS hostnames at a third-party provider. **Unverified.**

**Other open points:**

- Using a Pages project as the SaaS origin is **undocumented**. The documented pattern is a Worker as origin that routes on the `Host` header.
- Certificate validation over HTTP only succeeds once the Client's DNS record exists, which can mean brief downtime at go-live.
- Client CAA records must allow Cloudflare's certificate authority.

**Conclusion:** below Enterprise, Cloudflare for SaaS does not reliably serve Client apex domains, so it doesn't replace the default. It stays a candidate for later. If we ever move to Enterprise, or confirm CNAME flattening and Pages-behind-a-Worker in a test, it would let Clients keep their DNS.

Sources:
- `cloudflare-for-platforms/cloudflare-for-saas/plans/`
- `.../start/getting-started/`
- `.../advanced-settings/apex-proxying/`
- `.../advanced-settings/custom-origin/`
- `.../advanced-settings/worker-as-origin/`
- the Cloudflare for SaaS changelog (2025-05-27)

## Nameserver cutover checklist

1. Export the Client's current zone. Import and verify **every** record in our zone, especially MX, SPF, DKIM, DMARC and verification TXT records.
2. Lower TTLs at the current provider at least 24–48 h before the cutover.
3. Record the DNS record inventory in the Client Knowledge Base and mark email and verification records as "change only with Client approval".
4. Switch nameservers, then confirm resolution, the site on the apex and `www`, and TLS.
5. Test email delivery both ways, plus SPF/DKIM/DMARC alignment, after the cutover.

When a Client leaves, the same checklist runs in reverse: export our zone file, the Client repoints its nameservers, and we delete the zone after a set grace period.

## Consequences

Our Cloudflare account now controls Client DNS and email routing, so it is critical infrastructure:

- 2FA is required for every member.
- Roles are least-privilege.
- API tokens are scoped to what they need; no global API keys.
- Audit logging is on and reviewed.

All four are available below Enterprise:

- 2FA enforcement for all members.
- Domain-scoped roles; resource-scoped roles are in beta.
- API tokens scoped by resource, client IP and expiry.
- Audit logs kept for 18 months. The dashboard shows only the last 90 days, so older entries need the API or Logpush.

## Milestone

M0: our own domain with standard DNS. M1: the nameserver default and cutover checklist, with the first paying Client. www-CNAME fallback: DESIGNED. See ADR-0039.
