# A script and style Content Security Policy

Status: ready-for-agent
Source: audit M4, Batch 2 deferral, 2026-09-28

## Problem

`_headers` has a header-only CSP (framing, `<base>`, plugins). There's no `script-src`/`style-src` policy: CookieYes and GTM inject scripts and inline styles, and Astro's hash-based `security.csp` would block them.

## Task

Try Astro `security.csp` with `strict-dynamic`, plus the sources Turnstile, CookieYes, GTM and GA4 need, in a real browser (chrome-devtools-mcp or Playwright): the banner, consent, GTM loading after consent, GA4 hits, Turnstile, and the form must all work with a clean console. Start as `Content-Security-Policy-Report-Only` on previews. Only switch it on if everything works; otherwise record why here.

**M1**.
