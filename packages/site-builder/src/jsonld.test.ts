import { describe, expect, it } from "vitest";
import type { Page, SiteDefinition } from "./definition.ts";
import { jsonLd, jsonLdScript } from "./jsonld.ts";

// Issue 06's rules: structured data says only what the site definition publishes, leaves out
// what it doesn't, and has no LocalBusiness, review or rating markup.
const site = {
  meta: { name: { en: "Fixture Co" }, site_url: "https://example.test", default_language: "en", languages: ["en"] },
} as unknown as SiteDefinition;

const text = (en: string) => ({ en });
const page = (sections: unknown[], type = "services") =>
  ({ id: type, type, slug: { en: type === "home" ? "" : type }, sections }) as unknown as Page;

const services = {
  component: "services",
  variant: "grid",
  text: { heading: text("What we do") },
  items: [{ text: { title: text("Websites"), body: text("Fast sites built from verified facts.") } }],
};
const faq = {
  component: "faq",
  variant: "list",
  text: { heading: text("Questions") },
  items: [{ text: { question: text("How long does it take?"), answer: text("Two to three weeks.") } }],
};

describe("JSON-LD (issue 06)", () => {
  it("describes the business on the home page, with only what the definition says", () => {
    const graph = jsonLd(site, page([], "home"), "en", { logo: "/logo.svg" });
    expect(graph).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://example.test/#organization",
          name: "Fixture Co",
          url: "https://example.test/",
          logo: "https://example.test/logo.svg",
        },
      ],
    });
  });

  it("turns services and FAQ sections into Service and FAQPage, word for word", () => {
    const graph = jsonLd(site, page([services, faq]), "en", {});
    expect(graph?.["@graph"]).toEqual([
      {
        "@type": "Service",
        name: "Websites",
        description: "Fast sites built from verified facts.",
        provider: { "@id": "https://example.test/#organization" },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "How long does it take?", acceptedAnswer: { "@type": "Answer", text: "Two to three weeks." } },
        ],
      },
    ]);
  });

  it("emits nothing for a page with nothing to describe, and no Organization without a name", () => {
    expect(jsonLd(site, page([]), "en", {})).toBeNull();
    const nameless = { meta: { ...site.meta, name: undefined } } as unknown as SiteDefinition;
    expect(jsonLd(nameless, page([], "home"), "en", {})).toBeNull();
  });

  it("never adds LocalBusiness, reviews or ratings", () => {
    const json = JSON.stringify(jsonLd(site, page([services, faq], "home"), "en", {}));
    expect(json).not.toMatch(/LocalBusiness|ProfessionalService|Review|Rating|address|telephone|sameAs|geo/);
  });

  it("can't close its script element", () => {
    const evil = { ...faq, items: [{ text: { question: text("</script><script>alert(1)"), answer: text("x") } }] };
    expect(jsonLdScript(jsonLd(site, page([evil]), "en", {}))).not.toContain("</script><script>");
  });
});
