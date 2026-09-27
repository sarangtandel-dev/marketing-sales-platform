import type { SiteDefinition } from "./definition.ts";
import { wordingVersion } from "./wording.ts";

// What the form Worker accepts for one Client (audit security M2): each form's type, its
// field names, and the opt-in wording versions currently on the site. Anything else in a
// submission is rejected (unknown form or type) or dropped (unknown field or opt-in version).
export type FormsManifest = {
  client: string;
  forms: Record<string, { form_type: string; fields: string[]; opt_ins: { email?: string[] } }>;
};

export function formsManifest(site: SiteDefinition): FormsManifest {
  const forms: FormsManifest["forms"] = {};
  for (const form of site.forms) {
    const email = (form.opt_ins ?? []).filter((o) => o.channel === "email").map((o) => wordingVersion(o.channel, o.label));
    forms[form.id] = {
      form_type: form.form_type,
      fields: form.fields.map((f) => f.name),
      opt_ins: email.length ? { email } : {},
    };
  }
  return { client: site.meta.client, forms };
}
