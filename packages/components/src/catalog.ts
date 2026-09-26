// The shared section components and the Section Variants each one offers.
// Site definitions may only use what's listed here (ADR-0019: no per-Client components).
export const catalog = {
  hero: { variants: ["centered", "split"] },
  "contact-form": { variants: ["stacked"] },
} as const satisfies Record<string, { variants: readonly string[] }>;

export type ComponentName = keyof typeof catalog;
