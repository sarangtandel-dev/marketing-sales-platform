import type { Cta, Form, Page, SiteDefinition, Text } from "../../src/definition.ts";
import { NOT_FOUND } from "../../src/constants.ts";
import { settings, site as loaded } from "virtual:msp/site";

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

// Everything a form component needs, resolved for one language and this build's settings.
export function formProps(id: string, lang: string) {
  const form: Form = site.forms.find((f) => f.id === id)!;
  return {
    id: form.id,
    formType: form.form_type,
    endpoint: settings.formEndpoint ?? form.endpoint,
    siteKey: settings.turnstileSiteKey!,
    language: lang,
    fields: form.fields.map((f) => ({
      name: f.name,
      type: f.type,
      label: t(f.label, lang),
      required: f.required ?? false,
      autocomplete: f.autocomplete,
      options: f.options?.map((o) => ({ value: o.value, label: t(o.label, lang) })),
    })),
    submit: t(form.submit, lang),
    success: t(form.success, lang),
    error: t(form.error, lang),
    privacyHref: pagePath(pageById(form.privacy_page), lang),
    privacyNotice: t(form.privacy_notice, lang),
  };
}

export type FormProps = ReturnType<typeof formProps>;
