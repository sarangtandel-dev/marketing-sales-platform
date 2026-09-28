import type { FAQPage, Organization, Service, WithContext } from "schema-dts";
import type { Page, SiteDefinition } from "./definition.ts";
import { homePathFor, pagePathFor } from "./seo.ts";

// Structured data (issue 06). It says only what the site definition publishes, word for
// word, and leaves out whatever it doesn't: no address, phone, profiles, prices or hours are
// guessed. No LocalBusiness (M2, local presence) and never review or rating markup.
type Node = Organization | Service | FAQPage;
type Graph = WithContext<Organization> & { "@graph": Node[] };

export function jsonLd(
  site: SiteDefinition,
  page: Page,
  lang: string,
  assets: { logo?: string },
): { "@context": "https://schema.org"; "@graph": Node[] } | null {
  const { site_url: siteUrl, name, default_language: defaultLanguage } = site.meta;
  const orgId = `${siteUrl}/#organization`;
  const graph: Node[] = [];

  if (name && pagePathFor(page, lang, defaultLanguage) === homePathFor(lang, defaultLanguage)) {
    graph.push({
      "@type": "Organization",
      "@id": orgId,
      name: name[lang],
      url: new URL("/", siteUrl).href,
      ...(assets.logo ? { logo: new URL(assets.logo, siteUrl).href } : {}),
    });
  }
  for (const section of page.sections) {
    if (section.component === "services") {
      for (const item of section.items ?? []) {
        graph.push({
          "@type": "Service",
          name: item.text.title[lang],
          description: item.text.body[lang],
          ...(name ? { provider: { "@id": orgId } } : {}),
        });
      }
    }
    if (section.component === "faq") {
      graph.push({
        "@type": "FAQPage",
        mainEntity: (section.items ?? []).map((item) => ({
          "@type": "Question",
          name: item.text.question[lang],
          acceptedAnswer: { "@type": "Answer", text: item.text.answer[lang] },
        })),
      });
    }
  }
  return graph.length ? ({ "@context": "https://schema.org", "@graph": graph } as Graph) : null;
}

// The JSON for a <script type="application/ld+json">. "<" is escaped so no value can close
// the script element.
export const jsonLdScript = (data: object | null) => (data ? JSON.stringify(data).replace(/</g, "\\u003c") : "");
