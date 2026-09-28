import type { Page } from "./definition.ts";

// A page's path: the default language sits at the root, others under /<lang>/ (ADR-0027).
export function pagePathFor(page: Page, lang: string, defaultLanguage: string): string {
  const parts = [lang === defaultLanguage ? "" : lang, page.slug[lang]].filter(Boolean);
  return parts.length ? `/${parts.join("/")}/` : "/";
}

// hreflang alternates for a page on a multi-language site, with x-default on the default
// language (ADR-0027). A single-language site needs none.
export function hreflangLinks(page: Page, languages: string[], defaultLanguage: string, siteUrl: string) {
  if (languages.length < 2) return [];
  const href = (lang: string) => new URL(pagePathFor(page, lang, defaultLanguage), siteUrl).href;
  return [
    ...languages.map((lang) => ({ hreflang: lang, href: href(lang) })),
    { hreflang: "x-default", href: href(defaultLanguage) },
  ];
}
