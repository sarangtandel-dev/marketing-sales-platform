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

  it("sends every tracking event to GA4 with exactly the parameters the site pushes", async () => {
    const { EVENTS } = await import("./events.ts");
    const ga4 = container.tag.filter((t) => t.type === "gaawe") as (Tag & { parameter: { key: string; value?: string; list?: { map: { key: string; value: string }[] }[] }[] })[];
    const sent = Object.fromEntries(
      ga4.map((t) => [
        t.parameter.find((p) => p.key === "eventName")!.value,
        (t.parameter.find((p) => p.key === "eventSettingsTable")?.list ?? []).map((row) => row.map.find((m) => m.key === "parameter")!.value),
      ]),
    );
    expect(sent).toEqual(Object.fromEntries(Object.entries(EVENTS).map(([k, v]) => [k, [...v]])));
  });

  it("defines every variable its tags use", () => {
    const names = new Set(container.variable.map((v) => v.name));
    const used = JSON.stringify([container.tag, container.trigger]).match(/{{([^}]+)}}/g) ?? [];
    const builtIns = new Set(["Page URL", "Event", "_event"]);
    for (const ref of used) {
      const name = ref.slice(2, -2);
      expect(names.has(name) || builtIns.has(name), name).toBe(true);
    }
  });
});
