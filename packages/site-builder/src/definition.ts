import { readFileSync } from "node:fs";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { type CatalogEntry, catalog } from "@msp/components/catalog";
import { NOT_FOUND } from "./constants.ts";

// Validation for the M0 site definition and Theme (ADR-0034, ADR-0019).
// Every problem is reported as { path, message } with a JSON Pointer path.

export type Issue = { path: string; message: string };

export type Text = Record<string, string>;

export type Section = {
  component: string;
  variant: string;
  text?: Record<string, Text>;
  ctas?: string[];
  form?: string;
  items?: { text: Record<string, Text>; page?: string }[];
};

export type Field = {
  name: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  label: Text;
  required?: boolean;
  autocomplete?: string;
  options?: { value: string; label: Text }[];
};

export type Form = {
  id: string;
  form_type: string;
  fields: Field[];
  endpoint: string;
  submit: Text;
  success: Text;
  error: Text;
  privacy_page: string;
  privacy_notice: Text;
  opt_ins?: { channel: "email"; label: Text }[];
};

export type Page = {
  id: string;
  type: string;
  slug: Text;
  seo: { title: Text; description: Text };
  sections: Section[];
};

export type Cta = {
  id: string;
  type: string;
  channel?: string;
  label: Text;
  target: { page: string } | { href: string };
  fallback?: string;
};

export type SiteDefinition = {
  meta: {
    schema_version: 1;
    client: string;
    site_url: string;
    theme: string;
    default_language: string;
    languages: string[];
    version: string;
    turnstile_site_key?: string;
  };
  pages: Page[];
  ctas: Cta[];
  forms: Form[];
  navigation: { page: string; label: Text }[];
  footer: { text: Text };
  tracking: { gtm?: string; ga4?: string; consent_tool?: { provider: "cookieyes"; id: string } };
  redirects?: { from: string; to: string }[];
};

export type Theme = Record<"colors" | "type", Record<string, string>> &
  Partial<Record<"spacing" | "radius" | "shadows", Record<string, string>>>;

const loadSchema = (name: string) =>
  JSON.parse(readFileSync(new URL(`../schema/${name}`, import.meta.url), "utf8"));

// Every value marked `x-localized` in the schema is recorded here during validation,
// so the language check can run over exactly the language-keyed objects.
let localized: { path: string; value: Text }[] = [];

const ajv = new Ajv2020({ allErrors: true });
ajv.addKeyword({
  keyword: "x-localized",
  schemaType: "boolean",
  errors: false,
  validate: (_: boolean, value: Text, _parent: unknown, cxt?: { instancePath: string }) => {
    localized.push({ path: cxt?.instancePath ?? "", value });
    return true;
  },
});

const checkSite = ajv.compile(loadSchema("site-definition.schema.json"));
const checkTheme = ajv.compile(loadSchema("theme.schema.json"));

function schemaIssues(errors: ErrorObject[] | null | undefined): Issue[] {
  return (errors ?? []).map((e) => {
    let message = e.message ?? "is invalid";
    if (e.keyword === "enum") message += `: ${(e.params.allowedValues as string[]).join(", ")}`;
    return { path: e.instancePath, message };
  });
}

export function validateTheme(data: unknown): Issue[] {
  return checkTheme(data) ? [] : schemaIssues(checkTheme.errors);
}

export function validateSiteDefinition(data: unknown): Issue[] {
  localized = [];
  if (!checkSite(data)) return schemaIssues(checkSite.errors);
  const site = data as SiteDefinition;
  return [
    ...languageIssues(site),
    ...componentIssues(site),
    ...referenceIssues(site),
    ...slugIssues(site),
    ...notFoundIssues(site),
    ...formFallbackIssues(site),
  ];
}

function notFoundIssues(site: SiteDefinition): Issue[] {
  const count = site.pages.filter((p) => p.type === NOT_FOUND).length;
  return count === 1
    ? []
    : [{ path: "/pages", message: `needs exactly one page of type "${NOT_FOUND}" (found ${count})` }];
}

function languageIssues(site: SiteDefinition): Issue[] {
  const { languages, default_language } = site.meta;
  const issues: Issue[] = [];
  if (!languages.includes(default_language)) {
    issues.push({
      path: "/meta/default_language",
      message: `"${default_language}" is not in meta.languages (${languages.join(", ")})`,
    });
  }
  // Every declared language needs every text key; there is no silent fallback (ADR-0034).
  for (const { path, value } of localized) {
    for (const lang of languages) {
      if (!(lang in value)) issues.push({ path, message: `missing text for language "${lang}"` });
    }
    for (const lang of Object.keys(value)) {
      if (!languages.includes(lang)) {
        issues.push({ path: `${path}/${lang}`, message: `language "${lang}" is not in meta.languages` });
      }
    }
  }
  return issues;
}

function componentIssues(site: SiteDefinition): Issue[] {
  const issues: Issue[] = [];
  site.pages.forEach((page, p) =>
    page.sections.forEach((section, s) => {
      const at = `/pages/${p}/sections/${s}`;
      const entry = (catalog as Record<string, CatalogEntry>)[section.component];
      if (!entry) {
        issues.push({
          path: `${at}/component`,
          message: `unknown component "${section.component}"; available: ${Object.keys(catalog).join(", ")}`,
        });
        return;
      }
      const name = `"${section.component}"`;
      if (!entry.variants.includes(section.variant)) {
        issues.push({
          path: `${at}/variant`,
          message: `${name} has no Section Variant "${section.variant}"; available: ${entry.variants.join(", ")}`,
        });
      }
      issues.push(...textKeyIssues(entry.text, section.text ?? {}, at, name));
      if (entry.items && !section.items) issues.push({ path: at, message: `${name} needs items` });
      if (!entry.items && section.items) issues.push({ path: `${at}/items`, message: `${name} doesn't take items` });
      if (entry.items) {
        section.items?.forEach((item, i) =>
          issues.push(...textKeyIssues(entry.items!, item.text, `${at}/items/${i}`, `${name} items`)),
        );
      }
      if (!entry.ctas && section.ctas?.length) issues.push({ path: `${at}/ctas`, message: `${name} doesn't show CTAs` });
      if (entry.form && !section.form) issues.push({ path: at, message: `${name} needs a form` });
      if (!entry.form && section.form) issues.push({ path: `${at}/form`, message: `${name} doesn't show a form` });
    }),
  );
  return issues;
}

function textKeyIssues(
  spec: { required: readonly string[]; optional?: readonly string[] },
  text: Record<string, unknown>,
  at: string,
  name: string,
): Issue[] {
  const allowed = [...spec.required, ...(spec.optional ?? [])];
  const issues: Issue[] = Object.keys(text)
    .filter((key) => !allowed.includes(key))
    .map((key) => ({ path: `${at}/text/${key}`, message: `${name} has no text "${key}"; it takes: ${allowed.join(", ")}` }));
  const missing = spec.required.filter((key) => !(key in text));
  if (missing.length) issues.push({ path: `${at}/text`, message: `${name} needs text: ${missing.join(", ")}` });
  return issues;
}

// ADR-0023: when a site has forms, every page offers a way to one: a form on the page,
// or a CTA to a page that has one.
function formFallbackIssues(site: SiteDefinition): Issue[] {
  if (!site.forms.length) return [];
  const hasForm = (page: Page) => page.sections.some((s) => s.form);
  const formPages = new Set(site.pages.filter(hasForm).map((p) => p.id));
  const ctaToForm = new Set(
    site.ctas.filter((c) => "page" in c.target && formPages.has(c.target.page)).map((c) => c.id),
  );
  return site.pages.flatMap((page, p) =>
    page.type === NOT_FOUND || hasForm(page) || page.sections.some((s) => s.ctas?.some((id) => ctaToForm.has(id)))
      ? []
      : [{ path: `/pages/${p}`, message: "offers no way to a form: add a contact-form section or a CTA to a form page" }],
  );
}

function referenceIssues(site: SiteDefinition): Issue[] {
  const pageIds = new Set(site.pages.map((p) => p.id));
  const ctaIds = new Set(site.ctas.map((c) => c.id));
  const formIds = new Set(site.forms.map((f) => f.id));
  const issues: Issue[] = [];
  const need = (ids: Set<string>, kind: string, id: string, path: string) => {
    if (!ids.has(id)) issues.push({ path, message: `no ${kind} with id "${id}"` });
  };

  site.pages.forEach((page, p) =>
    page.sections.forEach((section, s) => {
      section.ctas?.forEach((id, c) => need(ctaIds, "CTA", id, `/pages/${p}/sections/${s}/ctas/${c}`));
      if (section.form) need(formIds, "form", section.form, `/pages/${p}/sections/${s}/form`);
    }),
  );
  site.forms.forEach((form, f) => need(pageIds, "page", form.privacy_page, `/forms/${f}/privacy_page`));
  // The Worker delivers to Brevo, and records email opt-ins, by the field named "email".
  site.forms.forEach((form, f) => {
    form.fields.forEach((field, i) => {
      if (field.type === "email" && field.name !== "email") {
        issues.push({ path: `/forms/${f}/fields/${i}/name`, message: 'an email field must be named "email"' });
      }
    });
    const hasEmail = form.fields.some((field) => field.name === "email" && field.type === "email");
    if (form.opt_ins?.length && !hasEmail) {
      issues.push({ path: `/forms/${f}`, message: 'shows an email opt-in, so it needs an email field named "email"' });
    }
  });
  site.pages.forEach((page, p) =>
    page.sections.forEach((section, s) =>
      section.items?.forEach((item, i) => {
        if (item.page) need(pageIds, "page", item.page, `/pages/${p}/sections/${s}/items/${i}/page`);
      }),
    ),
  );
  // Google tags only ever load after consent (ADR-0020), so GTM needs a consent tool.
  if (site.tracking.gtm && !site.tracking.consent_tool) {
    issues.push({ path: "/tracking", message: "needs consent_tool because gtm is set (ADR-0020)" });
  }
  if (site.forms.length && !site.meta.turnstile_site_key) {
    issues.push({ path: "/meta", message: "needs turnstile_site_key because the site has forms (ADR-0028)" });
  }
  site.ctas.forEach((cta, c) => {
    if ("page" in cta.target) need(pageIds, "page", cta.target.page, `/ctas/${c}/target/page`);
    if (cta.fallback) need(ctaIds, "CTA", cta.fallback, `/ctas/${c}/fallback`);
  });
  site.navigation.forEach((item, n) => need(pageIds, "page", item.page, `/navigation/${n}/page`));

  const duplicates = (ids: string[], path: string) =>
    ids.forEach((id, i) => {
      if (ids.indexOf(id) !== i) issues.push({ path: `${path}/${i}/id`, message: `duplicate id "${id}"` });
    });
  duplicates(site.pages.map((p) => p.id), "/pages");
  duplicates(site.ctas.map((c) => c.id), "/ctas");
  duplicates(site.forms.map((f) => f.id), "/forms");
  return issues;
}

function slugIssues(site: SiteDefinition): Issue[] {
  const issues: Issue[] = [];
  for (const lang of site.meta.languages) {
    const seen = new Map<string, number>();
    site.pages.forEach((page, p) => {
      const slug = page.slug[lang];
      if (slug === undefined) return;
      const first = seen.get(slug);
      if (first !== undefined) {
        issues.push({
          path: `/pages/${p}/slug/${lang}`,
          message: `gives the same URL as page "${site.pages[first].id}"`,
        });
      } else {
        seen.set(slug, p);
      }
    });
  }
  return issues;
}
