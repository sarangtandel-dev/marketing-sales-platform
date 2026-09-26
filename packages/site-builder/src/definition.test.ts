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

  it("only offers email marketing opt-ins in M0, each with a wording version", () => {
    const s = site();
    s.forms[0].opt_ins = [{ channel: "sms", version: "v1", label: { en: "Texts" } }];
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/forms/0/opt_ins/0/channel",
      message: expect.stringContaining("email"),
    });
    s.forms[0].opt_ins = [{ channel: "email", label: { en: "Emails" } }];
    expect(validateSiteDefinition(s)).toContainEqual({
      path: "/forms/0/opt_ins/0",
      message: expect.stringContaining("version"),
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
