// The automated half of the M0 launch checklist (spec: "Launch checklist").
// Usage: pnpm check:launch clients/<slug> [--worker path/to/wrangler.jsonc]
// (default Worker config: packages/form-worker/wrangler.jsonc, the production environment)
// Exits 1 if any automated check fails, and always lists what a person still has to check.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseFacts, validateFacts } from "@msp/knowledge-base";
import { type SiteDefinition, validateSiteDefinition } from "@msp/site-builder/definition";

const PLACEHOLDER = /TO[ _-]?FILL/i;
// Cloudflare's published Turnstile test site keys start with 1x, 2x or 3x followed by zeros.
const TURNSTILE_TEST_KEY = /^[123]x0{20}/;

const MANUAL = [
  "Every claim on the site matches a Fact in facts.yaml whose status makes it publishable; High-risk Claims are publicly-verified or document-verified; no superlatives without a third-party Source (ADR-0007).",
  "Any hand-written JSON-LD follows issue 06's rules.",
  "Every image has alt text and recorded rights; no AI image shows real people, premises or work (ADR-0018).",
  "The Theme's colour pairs pass WCAG AA contrast.",
  "A qualified person has reviewed the privacy policy (ticket 34), and the reviewer and date are recorded.",
  "A test Lead has gone end to end on the preview (scripts/send-test-lead.ts), with events and the consent banner checked.",
  "The owner alert address is verified in Email Routing, and the deployed send_email binding accepts the structured message (ticket 36).",
  "Search Console has the sitemap; the uptime monitor and the daily test Lead are running against production.",
  "GTM: the repo container (packages/tracking/gtm/container.json) is imported, the GA4 measurement ID variable is set, and generate_lead is a key event in GA4.",
  "CookieYes: categories, banner wording and Consent Mode are set up, and the banner reopens from the footer's Cookie settings link.",
  "Brevo: every contact attribute the Worker writes exists (one per form field, plus LEAD_ID, FORM_ID, FORM_TYPE, LEAD_RECEIVED_AT, PAGE_URL and the EMAIL_OPT_IN_* ones), and the double opt-in template and redirect are set.",
  "The preview Worker is deployed with Turnstile's test secret and no Brevo key, and PREVIEW_FORM_ENDPOINT points at it.",
  "DNS: the domain is on Cloudflare, existing mail (MX) records survived the move, and Email Routing is on (docs/procedures/release-worker.md).",
  "Worker secrets are set (TURNSTILE_SECRET_KEY, BREVO_API_KEY, MONITOR_SECRET, HEARTBEAT_URL, NTFY_URL) and the healthchecks.io check expects a daily ping.",
];

const WORKER_CONFIG = resolve(import.meta.dirname, "../packages/form-worker/wrangler.jsonc");

type Result = { ok: boolean; check: string; detail?: string };

function readJson(file: string, text = readFileSync(file, "utf8")) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${file} isn't valid JSON: ${(err as Error).message}`);
  }
}

// wrangler.jsonc is JSON with comments; strings (which can hold "//", as URLs do) are kept.
const stripComments = (text: string) =>
  text.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, str) => str ?? "");

// An address or domain from the docs, not a real one.
const PLACEHOLDER_EMAIL = /@(example\.(com|org|net)|[^@\s]*\.(test|invalid|example))$/i;

// The production Worker's config (its top level; env.preview is the preview Worker).
function checkWorker(file: string, site: SiteDefinition): Result[] {
  const config = readJson(file, stripComments(readFileSync(file, "utf8"))) as {
    d1_databases?: { database_id?: string }[];
    send_email?: { destination_address?: string }[];
    vars?: Record<string, string>;
  };
  const vars = config.vars ?? {};
  const results: Result[] = [];
  const databaseId = config.d1_databases?.[0]?.database_id ?? "";
  results.push({
    ok: databaseId !== "" && !/^0{8}-/.test(databaseId),
    check: "the Worker's Lead Log is a real D1 database (d1_databases database_id)",
    detail: databaseId || "missing",
  });
  const addresses: [string, string | undefined][] = [
    ["ALERT_FROM", vars.ALERT_FROM],
    ["ALERT_TO", vars.ALERT_TO],
    ["MONITOR_TEST_EMAIL", vars.MONITOR_TEST_EMAIL],
    ...(config.send_email ?? []).map((b): [string, string | undefined] => ["send_email destination_address", b.destination_address]),
  ];
  const fake = addresses.filter(([, value]) => !value || PLACEHOLDER_EMAIL.test(value));
  results.push({
    ok: fake.length === 0,
    check: "the Worker's alert and monitoring addresses are real",
    detail: fake.map(([name, value]) => `${name}: ${value ?? "missing"}`).join(", "),
  });
  results.push({
    ok: vars.CLIENT_SLUG === site.meta.client,
    check: "the Worker's CLIENT_SLUG is this Client",
    detail: `CLIENT_SLUG is ${vars.CLIENT_SLUG ?? "missing"}, the Client is ${site.meta.client}`,
  });
  // Settings that belong to the preview Worker only (audit follow-up).
  const previewOnly = ["TURNSTILE_SKIP_HOSTNAME", "ALERT_SUBJECT_PREFIX"].filter((name) => name in vars);
  results.push({
    ok: previewOnly.length === 0,
    check: "the production Worker has no preview-only settings",
    detail: previewOnly.join(", "),
  });
  const origin = new URL(site.meta.site_url).origin;
  const origins = (vars.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim());
  results.push({
    ok: origins.includes(origin),
    check: "the Worker's ALLOWED_ORIGINS includes the site, or every Visitor is refused",
    detail: `${origin} isn't in ALLOWED_ORIGINS (${vars.ALLOWED_ORIGINS ?? "missing"})`,
  });
  return results;
}

function checkClient(dir: string, workerFile: string): Result[] {
  const results: Result[] = [];
  const files = {
    site: join(dir, "site/site-definition.json"),
    facts: join(dir, "facts.yaml"),
  };
  for (const [name, file] of Object.entries(files)) {
    if (!existsSync(file)) results.push({ ok: false, check: `${name} file exists`, detail: file });
  }
  if (results.length) return results;

  const siteText = readFileSync(files.site, "utf8");
  const site = readJson(files.site, siteText) as SiteDefinition;
  const themeFile = resolve(dir, "site", site.meta.theme);
  const factsText = readFileSync(files.facts, "utf8");

  const siteIssues = validateSiteDefinition(site);
  results.push({
    ok: siteIssues.length === 0,
    check: "site definition is valid",
    detail: siteIssues.map((i) => `${i.path}: ${i.message}`).join("; "),
  });

  for (const [file, text] of [
    [files.site, siteText],
    [themeFile, existsSync(themeFile) ? readFileSync(themeFile, "utf8") : ""],
    [files.facts, factsText],
  ] as const) {
    const lines = text.split("\n").flatMap((line, i) => (PLACEHOLDER.test(line) ? [i + 1] : []));
    results.push({
      ok: lines.length === 0,
      check: `no TO FILL placeholders in ${file}`,
      detail: lines.length ? `lines ${lines.slice(0, 10).join(", ")}${lines.length > 10 ? ", …" : ""}` : undefined,
    });
  }

  const facts = parseFacts(factsText) as { facts?: { id: string; status: string }[] };
  const factIssues = validateFacts(facts);
  results.push({
    ok: factIssues.length === 0,
    check: "facts.yaml is valid",
    detail: factIssues.map((i) => `${i.path}: ${i.message}`).join("; "),
  });
  const pending = (facts.facts ?? []).filter((f) => f.status === "unverified" || f.status === "rejected");
  results.push({
    ok: pending.length === 0,
    check: "no unverified or rejected Facts remain (verify them or remove them)",
    detail: pending.map((f) => `${f.id} (${f.status})`).join(", "),
  });

  results.push({
    ok: !/\.pages\.dev$/.test(new URL(site.meta.site_url).hostname),
    check: "site_url is the real domain, not pages.dev (ADR-0028)",
    detail: site.meta.site_url,
  });
  if (site.forms.length) {
    const key = site.meta.turnstile_site_key ?? "";
    results.push({
      ok: key !== "" && !TURNSTILE_TEST_KEY.test(key),
      check: "the production Turnstile site key is set, not a test key",
      detail: key || "missing",
    });
    const endpoints = site.forms.map((f) => f.endpoint).filter((e) => /\.(invalid|test|example)\b|example\.com/.test(e));
    results.push({ ok: endpoints.length === 0, check: "form endpoints are real", detail: endpoints.join(", ") });
    // The production Worker has no workers.dev address (workers_dev: false): it's served on a
    // route on the Client's own domain.
    const domain = new URL(site.meta.site_url).hostname.replace(/^www\./, "");
    const offDomain = site.forms
      .map((f) => f.endpoint)
      .filter((e) => {
        const host = new URL(e).hostname;
        return host !== domain && !host.endsWith(`.${domain}`);
      });
    results.push({
      ok: offDomain.length === 0,
      check: "forms post to the Worker's route on the Client's own domain",
      detail: offDomain.join(", "),
    });
    results.push(...checkWorker(workerFile, site));
  }
  const missing = (["gtm", "ga4", "consent_tool"] as const).filter((k) => !site.tracking[k]);
  results.push({ ok: missing.length === 0, check: "gtm, ga4 and consent_tool are set", detail: missing.join(", ") });
  return results;
}

const args = process.argv.slice(2);
const workerAt = args.indexOf("--worker");
const workerFile = workerAt >= 0 ? resolve(args.splice(workerAt, 2)[1] ?? "") : WORKER_CONFIG;
const [dir] = args;
if (!dir) {
  console.error("usage: pnpm check:launch clients/<slug> [--worker path/to/wrangler.jsonc]");
  process.exit(2);
}

// Malformed input is a failed check with the reason, never a stack trace.
let results: Result[];
try {
  results = checkClient(resolve(dir), workerFile);
} catch (err) {
  results = [{ ok: false, check: "the Client's files can be read", detail: (err as Error).message }];
}
console.log(`Launch check for ${dir}\n`);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.check}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
}
console.log("\nStill to check by hand:");
for (const item of MANUAL) console.log(`  [ ] ${item}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} automated check(s) failed.` : "\nAll automated checks pass.");
process.exit(failed ? 1 : 0);
