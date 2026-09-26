# M0 gaps that need a decision before Client #0 launches

Status: needs-triage
Source: ADR-0039 re-audit, 2026-09-17

These items weren't in the M0 scope list, but each one affects whether M0 captures leads **safely**. There's a recommendation for each.

1. **Consent signal for GA4 (ADR-0020, ADR-0022).**
   - **Problem:** M0 includes GA4 through GTM and a tracking script that waits for consent (issue 02). Without a consent tool there's nothing to wait for. The agency site is also public, so EU and UK Visitors will arrive, and ADR-0014's fallback applies.
   - **Recommendation:** include the off-the-shelf consent tool in M0, configured by hand as opt-in for everyone, with Consent Mode in basic mode. About 0.5 day.
2. **Secrets check on commits (ADR-0016).**
   - **Problem:** the Worker holds Brevo and Turnstile secrets.
   - **Recommendation:** add a secrets scan to pre-commit and CI in M0 (about 0.25 day). The full personal-data and binary checks stay in M1.
3. **Alt text, image rights and contrast (ADR-0018, ADR-0019).**
   - **Recommendation:** a manual checklist item at M0 launch; the automated checks come in M1.
4. **Uptime checks (ADR-0037).**
   - **Recommendation:** M0. A free external uptime monitor takes about 0.25 day.
5. **Owner alert channel (ADR-0013).**
   - **Problem:** the alert must not depend on Brevo.
   - **Recommendation:** Cloudflare Email Routing's send-email binding, or a chat webhook, sent from the Worker after the Lead Log write. Decide which.
6. **Privacy policy review.**
   - **Problem:** our own policy covers DPDP, and GDPR for EU Visitors.
   - **Recommendation:** have it reviewed by a qualified person before launch, even though the full Privacy Law Profile machinery is M1 (issue 17).
7. **Does Client #0 count as "a real Client" for the M1 skill-build rule?**
   - **Recommendation:** yes, for steps M0 actually performs by hand: site definition, theme, build, QA, launch. Intake, research and strategy brief still need a manual run for the first paying Client before their skills are built.
