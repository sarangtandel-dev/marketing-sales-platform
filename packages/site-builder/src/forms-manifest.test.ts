import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formsManifest } from "./forms-manifest.ts";
import { loadSite } from "./load.ts";

const repo = join(import.meta.dirname, "../../..");

describe("forms manifest (what the form Worker accepts)", () => {
  it("lists each form's type, field names and current opt-in wording versions", () => {
    const { site } = loadSite(join(import.meta.dirname, "../test/fixtures/basic"));
    const manifest = formsManifest(site);
    expect(manifest.client).toBe("fixture-basic");
    expect(manifest.forms.contact).toEqual({
      form_type: "consultation_request",
      fields: ["name", "email", "company_size", "message"],
      opt_ins: { email: [expect.stringMatching(/^email-[0-9a-f]{12}$/)] },
    });
  });

  it("is up to date for Client #0 (run `pnpm forms:manifest` after changing its forms)", () => {
    const { site } = loadSite(join(repo, "clients/client-zero/site"));
    const committed = JSON.parse(readFileSync(join(repo, "packages/form-worker/src/forms.generated.json"), "utf8"));
    expect(committed).toEqual(formsManifest(site));
  });
});
