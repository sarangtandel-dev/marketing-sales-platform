// The shared section components, their Section Variants, and the text each one takes.
// Site definitions may only use what's listed here (ADR-0019: no per-Client components).
//   text:  the section's own text keys
//   items: list components take items, each with these text keys (and an optional page link)
//   ctas:  whether the section shows CTAs
//   form:  whether the section shows a form
//   image: the variants that show an optional image

export type CatalogEntry = {
  variants: readonly string[];
  text: { required: readonly string[]; optional?: readonly string[] };
  items?: { required: readonly string[]; optional?: readonly string[] };
  ctas?: boolean;
  form?: boolean;
  image?: readonly string[];
};

export const catalog = {
  hero: { variants: ["centered", "split"], text: { required: ["heading"], optional: ["body"] }, ctas: true, image: ["split"] },
  services: {
    variants: ["grid", "list"],
    text: { required: ["heading"], optional: ["body"] },
    items: { required: ["title", "body"] },
    ctas: true,
  },
  steps: {
    variants: ["numbered"],
    text: { required: ["heading"], optional: ["body"] },
    items: { required: ["title", "body"] },
    ctas: true,
  },
  // Testimonials need a Permission Record or a public Source before launch (ADR-0007).
  testimonials: {
    variants: ["cards", "single"],
    text: { required: ["heading"] },
    items: { required: ["quote", "name"], optional: ["role"] },
  },
  faq: { variants: ["accordion", "list"], text: { required: ["heading"] }, items: { required: ["question", "answer"] } },
  text: {
    variants: ["prose", "two-column"],
    text: { required: ["heading"], optional: ["intro"] },
    items: { required: ["body"], optional: ["title"] },
    ctas: true,
  },
  "cta-band": { variants: ["primary", "subtle"], text: { required: ["heading"], optional: ["body"] }, ctas: true },
  "contact-form": { variants: ["stacked"], text: { required: ["heading"], optional: ["body"] }, form: true },
} as const satisfies Record<string, CatalogEntry>;

export type ComponentName = keyof typeof catalog;

// Shared prop shapes for the components.
export type Cta = { id: string; type: string; label: string; href: string };
export type Item = { text: Record<string, string>; href?: string };
export type HeadingLevel = 1 | 2;
// A section image, already processed by the build (astro:assets) and with alt text resolved.
export type SectionImage = { src: import("astro").ImageMetadata; alt: string };
