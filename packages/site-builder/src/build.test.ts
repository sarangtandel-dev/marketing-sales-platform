import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import axe from "axe-core";
import { JSDOM } from "jsdom";
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

// axe-core's WCAG A/AA rules on a built page. jsdom has no layout, so colour contrast is
// left to the Theme check (the launch checklist) and a real browser.
async function axeViolations(html: string): Promise<string[]> {
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  dom.window.eval(axe.source);
  const run = (dom.window as unknown as { axe: typeof axe }).axe.run;
  const result = await run(dom.window.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  });
  dom.window.close();
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

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

  it("self-hosts and preloads the Theme's fonts, with the Theme's stack as fallback", () => {
    const home = read("index.html");
    expect(home).toMatch(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/);
    const css = readdirSync(out, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".css") || f.endsWith(".html"))
      .map((f) => read(f))
      .join("\n");
    expect(css).toMatch(/@font-face\s*{[^}]*Inter/);
    expect(css).toContain("--font-body:var(--msp-font-body)");
    expect(readdirSync(out, { recursive: true, encoding: "utf8" }).some((f) => f.endsWith(".woff2"))).toBe(true);
    expect(css).not.toMatch(/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|fontsource/);
  });

  it("gives every page social preview tags and the Theme's colour", () => {
    for (const file of htmlFiles(out)) {
      const html = read(file);
      for (const tag of ["og:title", "og:description", "og:url", "og:type", "twitter:card"]) {
        expect(html, `${file} ${tag}`).toMatch(new RegExp(`<meta[^>]*(property|name)="${tag}"[^>]*content="[^"]+"`));
      }
    }
    const home = read("index.html");
    expect(home).toContain('<meta property="og:site_name" content="Fixture Co"');
    expect(home).toContain('<meta property="og:image" content="https://example.test/og.png"');
    expect(home).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(home).toContain('<meta property="og:url" content="https://example.test/"');
    expect(home).toContain('<meta name="theme-color" content="#1d4ed8"');
    expect(home).not.toContain("hreflang");
  });

  it("shows the logo, with the business name as its alt text, linking home", () => {
    expect(read("index.html")).toMatch(/<a[^>]*href="\/"[^>]*>\s*<img[^>]*src="\/logo\.svg"[^>]*alt="Fixture Co"/);
  });

  it("serves the hero image resized, in a modern format, with its alt text and size", () => {
    const img = read("index.html").match(/<img[^>]*alt="A fixture team at work"[^>]*>/)?.[0] ?? "";
    expect(img).toMatch(/src="\/_astro\/[^"]+\.webp"/);
    expect(img).toMatch(/width="\d+"/);
    expect(img).toMatch(/height="\d+"/);
    expect(img).toContain('fetchpriority="high"');
  });

  it("sends security headers with every response (audit M4)", () => {
    const headers = read("_headers");
    expect(headers).toMatch(/^\/\*$/m);
    for (const h of [
      "Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
      "X-Content-Type-Options: nosniff",
      "Referrer-Policy: strict-origin-when-cross-origin",
      "Permissions-Policy: camera=(), microphone=(), geolocation=()",
      "Strict-Transport-Security: max-age=31536000",
    ]) {
      expect(headers).toContain(h);
    }
  });

  it("writes the definition's redirects as permanent redirects", () => {
    expect(read("_redirects")).toBe("/old-about /about/ 301\n");
  });

  it("copies the Client's public files and links the favicon", () => {
    expect(existsSync(join(out, "favicon.svg"))).toBe(true);
    expect(read("index.html")).toContain('<link rel="icon" href="/favicon.svg"');
  });

  it("offers a cookie settings link in the footer on every page", () => {
    for (const file of htmlFiles(out)) {
      expect(read(file), file).toMatch(/<button[^>]*class="[^"]*cky-banner-element[^"]*"[^>]*>Cookie settings<\/button>/);
    }
  });

  it("passes axe's accessibility rules on every page", async () => {
    for (const file of htmlFiles(out)) expect(await axeViolations(read(file)), file).toEqual([]);
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

  it("passes axe's accessibility rules with every component on the page", async () => {
    for (const file of htmlFiles(out)) expect(await axeViolations(readFileSync(join(out, file), "utf8")), file).toEqual([]);
  });

  it("inlines item icons as decorative SVG, with no icon requests at runtime", () => {
    const home = readFileSync(join(out, "index.html"), "utf8");
    expect(home).toMatch(/<svg [^>]*aria-hidden="true"[^>]*>/);
    expect(home).not.toMatch(/api\.iconify\.design|unpkg|jsdelivr/);
  });

  it("adds valid structured data for its services and FAQ sections", () => {
    const blocks = htmlFiles(out)
      .flatMap((f) => [...readFileSync(join(out, f), "utf8").matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)])
      .map((m) => JSON.parse(m[1]));
    const types = blocks.flatMap((b) => b["@graph"].map((n: { "@type": string }) => n["@type"]));
    expect(types).toContain("Service");
    expect(types).toContain("FAQPage");
  });

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

  it("fails when a Theme font file is missing", () => {
    const dir = join(tmp, "missing-font");
    cpSync(fixture, dir, { recursive: true });
    rmSync(join(dir, "fonts"), { recursive: true });
    const result = build(dir, join(tmp, "missing-font-out"));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("/fonts/body/files/0/src");
  });

  it("fails when an image file is missing", () => {
    const dir = join(tmp, "missing-image");
    cpSync(fixture, dir, { recursive: true });
    rmSync(join(dir, "images"), { recursive: true });
    const result = build(dir, join(tmp, "missing-image-out"));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("/pages/0/sections/0/image/src");
  });

  it("needs the business name when there's a logo, as its alt text", () => {
    const dir = join(tmp, "nameless-logo");
    cpSync(fixture, dir, { recursive: true });
    const file = join(dir, "site-definition.json");
    const s = JSON.parse(readFileSync(file, "utf8"));
    delete s.meta.name;
    writeFileSync(file, JSON.stringify(s));
    const result = build(dir, join(tmp, "nameless-logo-out"));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("/meta/name");
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
