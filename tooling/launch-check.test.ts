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

const check = (dir: string) =>
  spawnSync(process.execPath, [join(import.meta.dirname, "launch-check.ts"), dir], { encoding: "utf8" });

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

  it("fails on an invalid site definition", () => {
    const result = check(client((s) => (s.pages[0].sections[0].variant = "diagonal")));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("/pages/0/sections/0/variant");
  });
});
