import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The GTM container in the repo is the source of truth (ADR-0022): GTM only listens.
type Tag = { name: string; type: string; firingTriggerId?: string[]; consentSettings?: { consentStatus: string } };
type Trigger = { triggerId: string; name: string; type: string; customEventFilter?: unknown[] };
const container = JSON.parse(readFileSync(join(import.meta.dirname, "../gtm/container.json"), "utf8"))
  .containerVersion as { tag: Tag[]; trigger: Trigger[]; variable: { name: string }[] };

// GTM's built-in "All Pages" and "Initialization - All Pages" triggers.
const BUILT_IN = new Set(["2147479553", "2147479573"]);

describe("GTM container", () => {
  it("has no click, form or other listener triggers of its own", () => {
    for (const trigger of container.trigger) expect(trigger.type, trigger.name).toBe("CUSTOM_EVENT");
  });

  it("fires every tag from a trigger that exists", () => {
    const ids = new Set(container.trigger.map((t) => t.triggerId));
    for (const tag of container.tag) {
      expect(tag.firingTriggerId?.length, tag.name).toBeGreaterThan(0);
      for (const id of tag.firingTriggerId!) expect(ids.has(id) || BUILT_IN.has(id), `${tag.name} → ${id}`).toBe(true);
    }
  });

  it("requires analytics consent on every tag", () => {
    for (const tag of container.tag) expect(tag.consentSettings?.consentStatus, tag.name).toBe("NEEDED");
  });

  it("defines every variable its tags use", () => {
    const names = new Set(container.variable.map((v) => v.name));
    const used = JSON.stringify(container.tag).match(/{{([^}]+)}}/g) ?? [];
    const builtIns = new Set(["Page URL", "Event"]);
    for (const ref of used) {
      const name = ref.slice(2, -2);
      expect(names.has(name) || builtIns.has(name), name).toBe(true);
    }
  });
});
