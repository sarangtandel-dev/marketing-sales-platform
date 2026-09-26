# 22: Tracer: form → Worker → Lead Log

**What to build:** A Visitor fills in a form on the preview site and submits it. The form Worker rejects spam, writes the Lead to the D1 Lead Log, and only then replies with success. The form then shows a success message, or an error with a retry option if the write failed (ADR-0013 steps 1–3).

**Blocked by:** 21

Status: ready-for-agent

Source: `.scratch/module-1-website/spec.md` (M0), 2026-09-27

- [x] The form component is driven by the site definition's `forms[]` and posts to the Worker endpoint. A privacy notice link sits next to the submit button (ADR-0021)
- [x] A filled honeypot or a failed server-side Turnstile check is rejected with a generic error and never stored
- [x] Preview uses Turnstile test keys and production uses the production widget, selected by environment (ADR-0028)
- [x] Each accepted submission gets a lead ID. Resubmitting with the same client-side submission token returns the existing lead ID and creates no second row
- [x] Success is returned only after the Lead Log write commits. A failed write returns an error, and the form offers a retry
- [x] The Lead Log is D1 with a location hint near India (ADR-0029). The row shape follows the spec's Lead Log row, with columns added by later tickets allowed to be empty
- [x] Seam 2 tests: honeypot, Turnstile failure, store-before-reply, write failure, duplicate token

## Comments

2026-09-27: built and checked end to end in a browser.

- **Worker** (`packages/form-worker`): answers `POST /lead` and nothing else.
  - The body is checked for shape and size.
  - Origins come from an allow-list, with CORS handled for the site.
  - The honeypot is checked before the server-side Turnstile check.
  - Then comes a D1 insert with `ON CONFLICT (submission_token) DO NOTHING`, and only then success.
  - Replies: 400 `invalid` or `rejected`, 403 for a disallowed origin, 503 `unavailable` when the Lead Log write fails.
  - The first migration creates the whole Lead Log row, including the columns later tickets fill.
- **Site:**
  - Forms are declared in the site definition: fields, submit, success and error text, and a privacy page and notice. They're shown by a new `contact-form` component with the Section Variant `stacked`.
  - The browser keeps the same submission token across retries, and asks Turnstile for a fresh token on each retry because tokens are single-use.
  - A `--preview` build switches to Turnstile's test key, and `--form-endpoint` overrides where forms post.
  - The site definition gains `meta.turnstile_site_key`, which is required when the site has forms.
- **Tests:** 10 seam 2 tests run in Miniflare with Turnstile faked at its HTTP boundary. Seam 1 now has 5 form tests and 3 extra validation tests.
- **End-to-end browser check** (wrangler dev with a local D1, a preview build and the real Turnstile test widget):
  - A submission landed in the Lead Log with the right form, fields, page URL and language.
  - A failed request showed the error message and re-enabled the button, and the retry then succeeded.
  - The console shows no warnings after the widget-cleanup fix.
- **Decision:** the Turnstile script has no SRI hash, because Cloudflare updates it in place. There's a comment next to the tag.
