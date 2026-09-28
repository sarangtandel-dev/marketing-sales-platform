import { describe, expect, it } from "vitest";
import type { Page } from "./definition.ts";
import { hreflangLinks, pagePathFor } from "./seo.ts";

const page = { id: "about", type: "about", slug: { en: "about", hi: "hamare-baare-mein" } } as unknown as Page;
const home = { id: "home", type: "home", slug: { en: "", hi: "" } } as unknown as Page;

describe("page paths (ADR-0027)", () => {
  it("puts the default language at the root and others under /<lang>/", () => {
    expect(pagePathFor(page, "en", "en")).toBe("/about/");
    expect(pagePathFor(page, "hi", "en")).toBe("/hi/hamare-baare-mein/");
    expect(pagePathFor(home, "en", "en")).toBe("/");
    expect(pagePathFor(home, "hi", "en")).toBe("/hi/");
  });
});

describe("hreflang alternates (ADR-0027)", () => {
  it("links every language version and x-default when there is more than one language", () => {
    expect(hreflangLinks(page, ["en", "hi"], "en", "https://example.test")).toEqual([
      { hreflang: "en", href: "https://example.test/about/" },
      { hreflang: "hi", href: "https://example.test/hi/hamare-baare-mein/" },
      { hreflang: "x-default", href: "https://example.test/about/" },
    ]);
  });

  it("adds nothing for a single-language site", () => {
    expect(hreflangLinks(page, ["en"], "en", "https://example.test")).toEqual([]);
  });
});
