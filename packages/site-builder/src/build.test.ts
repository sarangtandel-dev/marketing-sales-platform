import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Seam 1: run the real build CLI on a fixture and inspect what it writes.
const cli = join(import.meta.dirname, "cli.ts");
const fixture = join(import.meta.dirname, "../test/fixtures/basic");
const tmp = mkdtempSync(join(tmpdir(), "site-build-"));

function build(siteDir: string, outDir: string, flags: string[] = []) {
  return spawnSync(process.execPath, [cli, siteDir, outDir, ...flags], { encoding: "utf8", timeout: 120_000 });
}

const htmlFiles = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));

afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("building a valid site", () => {
  const out = join(tmp, "basic");
  let result: ReturnType<typeof build>;
  const read = (file: string) => readFileSync(join(out, file), "utf8");

  beforeAll(() => {
    result = build(fixture, out);
  }, 120_000);

  it("succeeds", () => {
    expect(result.stderr).not.toMatch(/error/i);
    expect(result.status).toBe(0);
  });

  it("writes every page, a 404 page, sitemap.xml and robots.txt", () => {
    for (const file of ["index.html", "about/index.html", "404.html", "sitemap.xml", "robots.txt"]) {
      expect(existsSync(join(out, file)), file).toBe(true);
    }
    expect(existsSync(join(out, "404/index.html"))).toBe(false);
  });

  it("renders page text, SEO tags and the language", () => {
    const home = read("index.html");
    expect(home).toContain('<html lang="en"');
    expect(home).toContain("<title>Fixture Co — Home</title>");
    expect(home).toContain('name="description" content="A fixture site used by the site builder tests."');
    expect(home).toContain('rel="canonical" href="https://example.test/"');
    expect(home).toContain("We build fixture sites");
    expect(read("404.html")).toContain("We couldn&#39;t find that page");
  });

  it("links navigation and CTAs to their pages, with the CTA Type on each CTA", () => {
    const home = read("index.html");
    expect(home).toMatch(/<a[^>]*href="\/about\/"[^>]*>About<\/a>/);
    expect(home).toMatch(/<a[^>]*href="\/contact\/"[^>]*data-cta-type="consultation_request"[^>]*>|<a[^>]*data-cta-type="consultation_request"[^>]*href="\/contact\/"[^>]*>/);
  });

  it("lists every page except the 404 in the sitemap", () => {
    const sitemap = read("sitemap.xml");
    expect(sitemap).toContain("<loc>https://example.test/</loc>");
    expect(sitemap).toContain("<loc>https://example.test/about/</loc>");
    expect(sitemap).not.toContain("404");
  });

  it("lets crawlers in and points them at the sitemap", () => {
    const robots = read("robots.txt");
    expect(robots).toContain("Sitemap: https://example.test/sitemap.xml");
    expect(robots).not.toMatch(/Disallow:\s*\/\s*$/m);
  });

  it("includes the tracking script on every page", () => {
    const scripts = readdirSync(out, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".js") || f.endsWith(".html"))
      .map((f) => read(f))
      .join("\n");
    expect(scripts).toContain("msp_first_touch");
    for (const file of htmlFiles(out)) expect(read(file), file).toMatch(/<script[^>]*type="module"/);
  });

  it("sets every Consent Mode default to denied before any other script runs", () => {
    const home = read("index.html");
    const head = home.slice(0, home.indexOf("</head>"));
    const firstScript = head.match(/<script[^>]*>([^]*?)<\/script>/)?.[1] ?? "";
    expect(firstScript).toContain('gtag("consent", "default"');
    for (const key of ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"]) {
      expect(firstScript).toMatch(new RegExp(`${key}: "denied"`));
    }
  });

  it("loads the configured consent tool, and never GTM directly", () => {
    const home = read("index.html");
    expect(home).toContain('src="https://cdn-cookieyes.com/client_data/fixture0000cookieyes/script.js"');
    expect(home.indexOf("cdn-cookieyes.com")).toBeGreaterThan(home.indexOf('gtag("consent", "default"'));
    expect(home).not.toMatch(/<script[^>]*src="[^"]*googletagmanager\.com/);
    expect(home).toContain('"gtm":"GTM-FIXTURE1"');
  });

  it("takes tracking IDs only from the site definition", () => {
    const dirs = [join(import.meta.dirname, "../../components/src"), join(import.meta.dirname, "../app")];
    for (const dir of dirs) {
      for (const file of readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => /\.(astro|ts)$/.test(f))) {
        expect(readFileSync(join(dir, file), "utf8"), file).not.toMatch(/GTM-[A-Z0-9]{4,}|G-[A-Z0-9]{6,}|cookieyes\.com\/client_data\/[a-z0-9]/);
      }
    }
  });

  it("changes the opt-in wording version whenever the wording changes (review #14)", () => {
    const version = (html: string) => html.match(/data-opt-in-version="([^"]+)"/)?.[1];
    const before = version(read("contact/index.html"));
    const dir = join(tmp, "reworded-src");
    cpSync(fixture, dir, { recursive: true });
    const file = join(dir, "site-definition.json");
    const s = JSON.parse(readFileSync(file, "utf8"));
    s.forms[0].opt_ins[0].label.en += " Promise.";
    writeFileSync(file, JSON.stringify(s));
    expect(build(dir, join(tmp, "reworded")).status).toBe(0);
    const after = version(readFileSync(join(tmp, "reworded", "contact/index.html"), "utf8"));
    expect(after).toMatch(/^email-[0-9a-f]{12}$/);
    expect(after).not.toBe(before);
  }, 120_000);

  it("never marks production output noindex", () => {
    for (const file of htmlFiles(out)) expect(read(file), file).not.toMatch(/noindex/i);
  });

  it("turns the Theme into CSS variables", () => {
    const css = readdirSync(out, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".css"))
      .map((f) => read(f))
      .join("\n");
    expect(css).toMatch(/--color-primary:\s*#1d4ed8/);
    expect(css).toMatch(/--font-heading:\s*Georgia, serif/);
  });
});

describe("forms", () => {
  const out = join(tmp, "basic");
  const contact = () => readFileSync(join(out, "contact/index.html"), "utf8");

  it("renders the form with its identity, endpoint and fields", () => {
    const html = contact();
    expect(html).toMatch(/<form[^>]*data-form-id="contact"/);
    expect(html).toMatch(/<form[^>]*data-form-type="consultation_request"/);
    expect(html).toMatch(/<form[^>]*action="https:\/\/forms\.example\.test\/lead"/);
    expect(html).toMatch(/<label[^>]*for="contact-name"[^>]*>Your name/);
    expect(html).toMatch(/<input[^>]*id="contact-email"[^>]*type="email"|<input[^>]*type="email"[^>]*id="contact-email"/);
    expect(html).toMatch(/<select[^>]*name="company_size"/);
    expect(html).toMatch(/<textarea[^>]*name="message"[^>]*required/);
    expect(html).toContain("Send enquiry");
  });

  it("has a hidden honeypot that people and autofill skip", () => {
    const honeypot = contact().match(/<input[^>]*name="website"[^>]*>/)?.[0] ?? "";
    expect(honeypot).toContain('tabindex="-1"');
    expect(honeypot).toContain('autocomplete="off"');
    expect(contact()).toMatch(/aria-hidden="true"[^>]*>[^]*?name="website"/);
  });

  it("offers the email marketing opt-in as an unticked checkbox with its wording version", () => {
    const box = contact().match(/<input[^>]*name="opt_in_email"[^>]*>/)?.[0] ?? "";
    expect(box).toContain('type="checkbox"');
    expect(box).toMatch(/data-opt-in-version="email-[0-9a-f]{12}"/);
    expect(box).not.toMatch(/\schecked/);
    expect(contact()).toContain("Send me occasional emails about our work.");
  });

  it("links the privacy notice next to the submit button", () => {
    expect(contact()).toMatch(/<a[^>]*href="\/about\/"[^>]*>How we use your details<\/a>/);
  });

  it("uses the production Turnstile site key in production", () => {
    expect(contact()).toContain('data-sitekey="0x4AAAAAAAFixtureProdKey"');
    expect(contact()).toContain("challenges.cloudflare.com/turnstile/v0/api.js");
  });

  it("uses Turnstile's test key and the preview endpoint in a preview build", () => {
    const previewOut = join(tmp, "preview");
    const result = build(fixture, previewOut, ["--preview", "--form-endpoint", "http://localhost:8787/lead"]);
    expect(result.status, result.stderr).toBe(0);
    const html = readFileSync(join(previewOut, "contact/index.html"), "utf8");
    expect(html).toContain('data-sitekey="1x00000000000000000000AA"');
    expect(html).not.toContain("0x4AAAAAAAFixtureProdKey");
    expect(html).toMatch(/<form[^>]*action="http:\/\/localhost:8787\/lead"/);
  }, 120_000);
});

describe("the component showcase", () => {
  const showcase = join(import.meta.dirname, "../test/fixtures/showcase");
  const out = join(tmp, "showcase");

  it("renders every catalogued component in every Section Variant", async () => {
    const { catalog } = await import("@msp/components/catalog");
    const result = build(showcase, out);
    expect(result.status, result.stderr).toBe(0);
    const html = htmlFiles(out).map((f) => readFileSync(join(out, f), "utf8")).join("\n");
    for (const [component, { variants }] of Object.entries(catalog)) {
      for (const variant of variants) {
        expect(html, `${component}/${variant}`).toContain(`data-section="${component}" data-variant="${variant}"`);
      }
    }
  }, 120_000);

  it("uses one h1 per page and no skipped heading levels", () => {
    for (const file of htmlFiles(out)) {
      const html = readFileSync(join(out, file), "utf8");
      const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      expect(levels.filter((l) => l === 1), file).toHaveLength(1);
      levels.forEach((level, i) => {
        if (i > 0) expect(level - levels[i - 1], `${file} heading ${i}`).toBeLessThanOrEqual(1);
      });
    }
  });
});

describe("building an invalid site", () => {
  it("fails and names the path and the rule broken", () => {
    const dir = join(tmp, "broken-src");
    cpSync(fixture, dir, { recursive: true });
    const file = join(dir, "site-definition.json");
    const site = JSON.parse(readFileSync(file, "utf8"));
    site.pages[0].sections[0].variant = "diagonal";
    writeFileSync(file, JSON.stringify(site));

    const result = build(dir, join(tmp, "broken-out"));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("/pages/0/sections/0/variant");
    expect(result.stderr).toContain("diagonal");
    expect(existsSync(join(tmp, "broken-out"))).toBe(false);
  });

  it("fails when the Theme is invalid", () => {
    const dir = join(tmp, "bad-theme");
    cpSync(fixture, dir, { recursive: true });
    writeFileSync(join(dir, "theme.json"), JSON.stringify({ colors: { primary: "#000" } }));
    const result = build(dir, join(tmp, "bad-theme-out"));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("theme.json");
    expect(result.stderr).toContain("type");
  });
});
