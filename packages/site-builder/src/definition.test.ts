import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSiteDefinition, validateTheme } from "./definition.ts";

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, "../test/fixtures/basic", name), "utf8"));

const site = () => fixture("site-definition.json");
const theme = () => fixture("theme.json");

describe("validateSiteDefinition", () => {
  it("accepts a valid site definition", () => {
    expect(validateSiteDefinition(site())).toEqual([]);
  });

  it("names a missing required field", () => {
    const s = site();
    delete s.meta.default_language;
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/meta",
      message: expect.stringContaining("default_language"),
    });
  });

  it("rejects an unknown component", () => {
    const s = site();
    s.pages[0].sections[0].component = "carousel";
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/pages/0/sections/0/component",
      message: expect.stringContaining("carousel"),
    });
  });

  it("rejects a Section Variant the component doesn't offer", () => {
    const s = site();
    s.pages[0].sections[0].variant = "diagonal";
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/pages/0/sections/0/variant",
      message: expect.stringContaining("diagonal"),
    });
  });

  it("fails when a declared language is missing a text key", () => {
    const s = site();
    s.meta.languages = ["en", "hi"];
    const issues = validateSiteDefinition(s);
    expect(issues).toContainEqual({
      path: "/pages/0/seo/title",
      message: expect.stringContaining('"hi"'),
    });
    expect(issues).toContainEqual({
      path: "/footer/text",
      message: expect.stringContaining('"hi"'),
    });
  });

  it("requires the default language to be declared", () => {
    const s = site();
    s.meta.default_language = "fr";
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/meta/default_language",
      message: expect.stringContaining("fr"),
    });
  });

  it("rejects references to CTAs and pages that don't exist", () => {
    const s = site();
    s.pages[0].sections[0].ctas = ["missing-cta"];
    s.navigation[1].page = "missing-page";
    const issues = validateSiteDefinition(s);
    expect(issues).toContainEqual({
      path: "/pages/0/sections/0/ctas/0",
      message: expect.stringContaining("missing-cta"),
    });
    expect(issues).toContainEqual({
      path: "/navigation/1/page",
      message: expect.stringContaining("missing-page"),
    });
  });

  it("rejects two pages with the same slug", () => {
    const s = site();
    s.pages[1].slug.en = "";
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/pages/1/slug/en",
      message: expect.stringContaining("same URL"),
    });
  });

  it("requires exactly one not-found page", () => {
    const s = site();
    s.pages = s.pages.filter((p: { type: string }) => p.type !== "not-found");
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/pages",
      message: expect.stringContaining("not-found"),
    });
  });

  it("rejects a section that points at a form that doesn't exist", () => {
    const s = site();
    s.pages[2].sections[0].form = "missing-form";
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/pages/2/sections/0/form",
      message: expect.stringContaining("missing-form"),
    });
  });

  it("requires a privacy page that exists for every form", () => {
    const s = site();
    s.forms[0].privacy_page = "nowhere";
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/forms/0/privacy_page",
      message: expect.stringContaining("nowhere"),
    });
  });

  it("requires a Turnstile site key when the site has forms", () => {
    const s = site();
    delete s.meta.turnstile_site_key;
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/meta",
      message: expect.stringContaining("turnstile_site_key"),
    });
  });

  it("only offers email marketing opt-ins in M0", () => {
    const s = site();
    s.forms[0].opt_ins = [{ channel: "sms", label: { en: "Texts" } }];
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/forms/0/opt_ins/0/channel",
      message: expect.stringContaining("email"),
    });
  });

  it("derives the wording version itself, so a hand-written one is rejected (review #14)", () => {
    const s = site();
    s.forms[0].opt_ins[0].version = "v1";
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/forms/0/opt_ins/0",
      message: expect.stringContaining("additional"),
    });
  });

  it("requires the email field to be named email (review #7)", () => {
    const s = site();
    s.forms[0].fields[1].name = "work_email";
    const issues = validateSiteDefinition(s);
    expect(issues).toContainEqual({ path: "/forms/0/fields/1/name", message: expect.stringContaining('"email"') });
    expect(issues).toContainEqual({ path: "/forms/0", message: expect.stringContaining("opt-in") });
  });

  it.each(["opt_in_sms", "page_url", "lead_id", "email_opt_in_at"])(
    "rejects the field name %s, which the form or the Worker would drop (audit B15)",
    (name) => {
      const s = site();
      s.forms[0].fields[0].name = name;
      expect(validateSiteDefinition(s)).toContainEqual({ path: "/forms/0/fields/0/name", message: expect.stringContaining("reserved") });
    },
  );

  it("rejects two fields with the same name in one form", () => {
    const s = site();
    s.forms[0].fields[0].name = s.forms[0].fields[2].name;
    expect(validateSiteDefinition(s)).toContainEqual({ path: "/forms/0/fields/2/name", message: expect.stringContaining("duplicate") });
  });

  it("allows at most one form per page (audit B15)", () => {
    const s = site();
    const page = s.pages.find((p: { sections: { form?: string }[] }) => p.sections.some((x) => x.form));
    page.sections.push({ ...page.sections.find((x: { form?: string }) => x.form) });
    const p = s.pages.indexOf(page);
    expect(validateSiteDefinition(s)).toContainEqual({ path: `/pages/${p}`, message: expect.stringContaining("one form") });
  });

  it("requires a cookie settings link whenever there's a consent tool", () => {
    const s = site();
    delete s.footer.cookie_settings;
    expect(validateSiteDefinition(s)).toContainEqual({ path: "/footer", message: expect.stringContaining("cookie_settings") });
  });

  it.each(["//evil.test/x", "/a\n/b /c 301", "/a b"])("rejects the redirect target %j (audit follow-up)", (to) => {
    const s = site();
    s.redirects = [{ from: "/old", to }];
    expect(validateSiteDefinition(s)).toContainEqual({ path: "/redirects/0/to", message: expect.stringContaining("pattern") });
  });

  it("takes the business name in every language", () => {
    const s = site();
    s.meta.name = { fr: "Fixture Co" };
    expect(validateSiteDefinition(s)).toContainEqual({ path: "/meta/name", message: expect.stringContaining('"en"') });
  });

  it("only accepts consent tools we've integrated", () => {
    const s = site();
    s.tracking.consent_tool = { provider: "homegrown", id: "x" };
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/tracking/consent_tool/provider",
      message: expect.stringContaining("cookieyes"),
    });
  });

  it("requires a consent tool whenever GTM is configured", () => {
    const s = site();
    delete s.tracking.consent_tool;
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/tracking",
      message: expect.stringContaining("consent_tool"),
    });
  });

  it("rejects text keys a component doesn't use, and requires the ones it needs", () => {
    const s = site();
    s.pages[0].sections[0].text = { headline: { en: "Typo" } };
    const issues = validateSiteDefinition(s);
    expect(issues).toContainEqual({ path: "/pages/0/sections/0/text/headline", message: expect.stringContaining("heading") });
    expect(issues).toContainEqual({ path: "/pages/0/sections/0/text", message: expect.stringContaining("heading") });
  });

  it("requires items for list components and rejects them elsewhere", () => {
    const s = site();
    s.pages[0].sections.push({ component: "services", variant: "grid", text: { heading: { en: "Services" } } });
    s.pages[0].sections[0].items = [{ text: { title: { en: "x" } } }];
    const issues = validateSiteDefinition(s);
    expect(issues).toContainEqual({ path: "/pages/0/sections/1", message: expect.stringContaining("items") });
    expect(issues).toContainEqual({ path: "/pages/0/sections/0/items", message: expect.stringContaining("hero") });
  });

  it("requires a form on every contact-form section", () => {
    const s = site();
    delete s.pages[2].sections[0].form;
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/pages/2/sections/0",
      message: expect.stringContaining("form"),
    });
  });

  it("requires every page to offer a way to a form (ADR-0023)", () => {
    const s = site();
    delete s.pages[1].sections[0].ctas;
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/pages/1",
      message: expect.stringContaining("form"),
    });
  });

  it("rejects a CTA Type outside ADR-0023's list", () => {
    const s = site();
    s.ctas[0].type = "buy_now";
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/ctas/0/type",
      message: expect.any(String),
    });
  });
});

describe("validateTheme", () => {
  it("accepts a valid Theme", () => {
    expect(validateTheme(theme())).toEqual([]);
  });

  it("only takes fonts for type tokens the Theme defines", () => {
    const t = theme();
    t.fonts = { display: { family: "Inter", provider: "fontsource" } };
    expect(validateTheme(t)).toContainEqual({ path: "/fonts/display", message: expect.stringContaining("type") });
  });

  it("requires colours and type", () => {
    const t = theme();
    delete t.colors;
    expect(validateTheme(t)).toContainEqual({
      path: "",
      message: expect.stringContaining("colors"),
    });
  });

  it("rejects a token that isn't a string", () => {
    const t = theme();
    t.radius.card = 12;
    expect(validateTheme(t)).toContainEqual({
      path: "/radius/card",
      message: expect.any(String),
    });
  });
});
