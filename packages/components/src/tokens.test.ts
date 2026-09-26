import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Components read only Theme tokens (ADR-0019): no raw colours, no Tailwind palette
// colours and no arbitrary colour values, so a Theme swap restyles everything.
const PALETTE =
  /\b(?:bg|text|border|from|to|via|ring|fill|stroke|outline|decoration|divide|accent|caret|shadow)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\b/;
const ARBITRARY_COLOUR = /\b(?:bg|text|border|ring|fill|stroke|shadow)-\[/;
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const FONT_FAMILY = /font-\[|font-family/;

describe("components use Theme tokens only", () => {
  const dir = import.meta.dirname;
  const files = readdirSync(dir).filter((f) => f.endsWith(".astro"));

  it("finds the components", () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it.each(files)("%s has no hard-coded colours or fonts", (file) => {
    const source = readFileSync(join(dir, file), "utf8");
    expect(source).not.toMatch(PALETTE);
    expect(source).not.toMatch(ARBITRARY_COLOUR);
    expect(source).not.toMatch(RAW_COLOUR);
    expect(source).not.toMatch(FONT_FAMILY);
  });
});
