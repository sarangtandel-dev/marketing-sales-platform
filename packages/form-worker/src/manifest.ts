import manifest from "./forms.generated.json";
import type { Submission } from "./submission.ts";

// This Client's forms, generated from its site definition (`pnpm forms:manifest`).
type Manifest = { client: string; forms: Record<string, { form_type: string; fields: string[]; opt_ins: { email?: string[] } }> };
const forms = (manifest as Manifest).forms;

// Returns the submission trimmed to what its form really has, or null for a form this
// Client's site doesn't have (audit security M2). Unknown fields and opt-in versions the
// site never showed are dropped rather than trusted.
export function applyManifest(s: Submission): Submission | null {
  const form = forms[s.form_id];
  if (!form || form.form_type !== s.form_type) return null;
  const fields = Object.fromEntries(Object.entries(s.fields).filter(([name]) => form.fields.includes(name)));
  const opt_ins = s.opt_ins.filter((o) => form.opt_ins[o.channel]?.includes(o.version));
  return { ...s, fields, opt_ins };
}
