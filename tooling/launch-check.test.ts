import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Drives the launch check CLI on throwaway Client directories.
const repo = resolve(import.meta.dirname, "..");
const fixture = join(repo, "packages/site-builder/test/fixtures/basic");
const tmp = mkdtempSync(join(tmpdir(), "launch-check-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const FACTS = `facts:
  - id: business-name
    kind: business-name
    value: "Fixture Co"
    source: { type: document, document: "certificate of incorporation", date: "2026-09-01" }
    status: document-verified
`;

let n = 0;
function client(edit: (site: Record<string, any>) => void = () => {}, facts = FACTS) {
  const dir = join(tmp, `client-${++n}`);
  mkdirSync(join(dir, "site"), { recursive: true });
  mkdirSync(join(dir, "design"), { recursive: true });
  const site = JSON.parse(readFileSync(join(fixture, "site-definition.json"), "utf8"));
  site.meta.theme = "../design/theme.json";
  site.meta.turnstile_site_key = "0x4AAAAAAAProductionKey";
  site.meta.site_url = "https://fixture-co.in";
  site.forms[0].endpoint = "https://forms.fixture-co.in/lead";
  edit(site);
  writeFileSync(join(dir, "site/site-definition.json"), JSON.stringify(site, null, 2));
  cpSync(join(fixture, "theme.json"), join(dir, "design/theme.json"));
  writeFileSync(join(dir, "facts.yaml"), facts);
  return dir;
}

// The form Worker's config as it should be at launch (JSONC, like the real one).
const WORKER = {
  name: "msp-form-worker",
  d1_databases: [{ binding: "LEAD_LOG", database_name: "lead-log-fixture", database_id: "4b1d8f0e-2c3a-4e5f-9a7b-1c2d3e4f5a6b" }],
  send_email: [{ name: "OWNER_ALERT", destination_address: "owner@fixture-co.in" }],
  vars: {
    CLIENT_SLUG: "fixture-basic",
    ALLOWED_ORIGINS: "https://fixture-co.in",
    ALERT_FROM: "alerts@fixture-co.in",
    ALERT_TO: "owner@fixture-co.in",
    MONITOR_TEST_EMAIL: "monitor@fixture-co.in",
  },
};

function worker(edit: (w: typeof WORKER) => void = () => {}) {
  const w = structuredClone(WORKER);
  edit(w);
  const file = join(tmp, `wrangler-${++n}.jsonc`);
  writeFileSync(file, `{\n  // The form Worker (https://example.invalid/docs)\n${JSON.stringify(w, null, 2).slice(1)}`);
  return file;
}

const check = (dir: string, workerFile = worker()) =>
  spawnSync(process.execPath, [join(import.meta.dirname, "launch-check.ts"), dir, "--worker", workerFile], { encoding: "utf8" });

describe("launch check", () => {
  it("passes a ready Client and still lists the checks a person must do", () => {
    const result = check(client());
    expect(result.stdout + result.stderr).toContain("PASS");
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/privacy policy/i);
    expect(result.stdout).toMatch(/alt text/i);
  });

  it("fails on a TO FILL placeholder, naming the file", () => {
    const result = check(client((s) => (s.pages[0].seo.title.en = "[TO FILL: title]")));
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/site-definition\.json.*TO FILL|TO FILL.*site-definition\.json/s);
  });

  it("fails while any Fact is unverified or rejected, naming it", () => {
    const facts = `${FACTS}  - id: years-in-business
    kind: years-in-business
    value: 12
    source: { type: person, who: "Founder", date: "2026-09-01" }
    status: unverified
`;
    const result = check(client(undefined, facts));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("years-in-business");
  });

  it("fails on a pages.dev site URL (ADR-0028)", () => {
    const result = check(client((s) => (s.meta.site_url = "https://fixture.pages.dev")));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("pages.dev");
  });

  it("fails on a placeholder form endpoint", () => {
    const result = check(client((s) => (s.forms[0].endpoint = "https://forms.example.test/lead")));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("forms.example.test");
  });

  it("fails on a Turnstile test key in production", () => {
    const result = check(client((s) => (s.meta.turnstile_site_key = "1x00000000000000000000AA")));
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/Turnstile/);
  });

  it("fails when GA4, GTM or the consent tool isn't set", () => {
    const result = check(client((s) => delete s.tracking.ga4));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ga4");
  });

  it.each([
    ["the placeholder database", (w: typeof WORKER) => (w.d1_databases[0].database_id = "00000000-0000-0000-0000-000000000000"), "database_id"],
    ["an example alert address", (w: typeof WORKER) => (w.vars.ALERT_TO = "owner@example.com"), "ALERT_TO"],
    ["an example send_email destination", (w: typeof WORKER) => (w.send_email[0].destination_address = "owner@example.com"), "destination_address"],
    ["another Client's slug", (w: typeof WORKER) => (w.vars.CLIENT_SLUG = "client-zero"), "CLIENT_SLUG"],
    ["an allow-list without the site", (w: typeof WORKER) => (w.vars.ALLOWED_ORIGINS = "https://fixture.pages.dev"), "ALLOWED_ORIGINS"],
    ["a preview-only setting", (w: typeof WORKER) => Object.assign(w.vars, { TURNSTILE_SKIP_HOSTNAME: "true" }), "TURNSTILE_SKIP_HOSTNAME"],
    ["the preview alert prefix", (w: typeof WORKER) => Object.assign(w.vars, { ALERT_SUBJECT_PREFIX: "[PREVIEW]" }), "ALERT_SUBJECT_PREFIX"],
  ])("fails on the Worker config's %s", (_, edit, named) => {
    const result = check(client(), worker(edit));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(named);
  });

  it("fails when a form posts somewhere other than the Client's own domain", () => {
    const result = check(client((s) => (s.forms[0].endpoint = "https://msp-form-worker.someone.workers.dev/lead")));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("workers.dev");
  });

  it("reports unreadable files as a failure instead of crashing", () => {
    const dir = client();
    writeFileSync(join(dir, "site/site-definition.json"), "{ not json");
    const result = check(dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL");
    expect(result.stdout).toContain("site-definition.json");
    expect(result.stderr).not.toMatch(/at .*launch-check\.ts/);
  });

  it("fails a Theme whose text colours don't meet WCAG AA contrast", () => {
    const dir = client();
    const file = join(dir, "design/theme.json");
    const theme = JSON.parse(readFileSync(file, "utf8"));
    theme.colors.muted = "#9ca3af";
    writeFileSync(file, JSON.stringify(theme));
    const result = check(dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("/colors/muted");
  });

  it("fails on an invalid site definition", () => {
    const result = check(client((s) => (s.pages[0].sections[0].variant = "diagonal")));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("/pages/0/sections/0/variant");
  });
});
