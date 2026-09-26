import type { Cta, Page, SiteDefinition, Text } from "../../src/definition.ts";
import { NOT_FOUND } from "../../src/constants.ts";
import { site as loaded } from "virtual:msp/site";

export const site: SiteDefinition = loaded;
export const { default_language: defaultLanguage, languages } = site.meta;

export const t = (text: Text, lang: string) => text[lang];

// The default language sits at the root; others go under /<lang>/ (ADR-0027).
export function pagePath(page: Page, lang: string): string {
  const parts = [lang === defaultLanguage ? "" : lang, page.slug[lang]].filter(Boolean);
  return parts.length ? `/${parts.join("/")}/` : "/";
}

export const pageById = (id: string) => site.pages.find((p) => p.id === id)!;

export const isNotFound = (page: Page) => page.type === NOT_FOUND;

export const publicPages = () => site.pages.filter((p) => !isNotFound(p));

export function ctaHref(cta: Cta, lang: string): string {
  return "page" in cta.target ? pagePath(pageById(cta.target.page), lang) : cta.target.href;
}

export const ctaById = (id: string) => site.ctas.find((c) => c.id === id)!;
