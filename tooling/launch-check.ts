// The automated half of the M0 launch checklist (spec: "Launch checklist").
// Usage: pnpm check:launch clients/<slug>
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
];

type Result = { ok: boolean; check: string; detail?: string };

function checkClient(dir: string): Result[] {
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
  const site = JSON.parse(siteText) as SiteDefinition;
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
  }
  const missing = (["gtm", "ga4", "consent_tool"] as const).filter((k) => !site.tracking[k]);
  results.push({ ok: missing.length === 0, check: "gtm, ga4 and consent_tool are set", detail: missing.join(", ") });
  return results;
}

const [dir] = process.argv.slice(2);
if (!dir) {
  console.error("usage: pnpm check:launch clients/<slug>");
  process.exit(2);
}

const results = checkClient(resolve(dir));
console.log(`Launch check for ${dir}\n`);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.check}${!r.ok && r.detail ? `\n      ${r.detail}` : ""}`);
}
console.log("\nStill to check by hand:");
for (const item of MANUAL) console.log(`  [ ] ${item}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} automated check(s) failed.` : "\nAll automated checks pass.");
process.exit(failed ? 1 : 0);
