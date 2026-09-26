# 22: Tracer: form → Worker → Lead Log

**What to build:** A Visitor fills in a form on the preview site and submits it. The form Worker rejects spam, writes the Lead to the D1 Lead Log, and only then replies with success. The form then shows a success message, or an error with a retry option if the write failed (ADR-0013 steps 1–3).

**Blocked by:** 21

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [ ] The form component is driven by the site definition's `forms[]` and posts to the Worker endpoint. A privacy notice link sits next to the submit button (ADR-0021)
- [ ] A filled honeypot or a failed server-side Turnstile check is rejected with a generic error and never stored
- [ ] Preview uses Turnstile test keys and production uses the production widget, selected by environment (ADR-0028)
- [ ] Each accepted submission gets a lead ID. Resubmitting with the same client-side submission token returns the existing lead ID and creates no second row
- [ ] Success is returned only after the Lead Log write commits. A failed write returns an error, and the form offers a retry
- [ ] The Lead Log is D1 with a location hint near India (ADR-0029). The row shape follows the spec's Lead Log row, with columns added by later tickets allowed to be empty
- [ ] Seam 2 tests: honeypot, Turnstile failure, store-before-reply, write failure, duplicate token
