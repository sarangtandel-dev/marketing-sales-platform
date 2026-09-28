import { describe, expect, it } from "vitest";
import { iconExists, iconSvg } from "./icons.ts";

describe("icons (one set: Lucide, inlined at build time)", () => {
  it("inlines an icon as decorative SVG", () => {
    const svg = iconSvg("rocket")!;
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 24 24"/);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
    expect(svg).toContain("<path");
  });

  it("knows which names exist", () => {
    expect(iconExists("rocket")).toBe(true);
    expect(iconExists("no-such-icon")).toBe(false);
    expect(iconSvg("no-such-icon")).toBeUndefined();
  });
});
