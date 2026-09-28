import Color from "colorjs.io";
import type { Issue, Theme } from "./definition.ts";

// The text-on-background pairs the components use (text-*, bg-*). Each must meet WCAG 2.1
// AA for normal text, 4.5:1; the check runs on every build, so a Theme can't ship unreadable.
const PAIRS = [
  ["on-surface", "surface"],
  ["muted", "surface"],
  ["primary", "surface"],
  ["on-primary", "primary"],
] as const;
const AA = 4.5;

export function contrastIssues(colors: Theme["colors"]): Issue[] {
  const missing = [...new Set(PAIRS.flat())].filter((token) => !colors[token]);
  if (missing.length) return [{ path: "/colors", message: `needs the colour tokens the components use: ${missing.join(", ")}` }];
  return PAIRS.flatMap(([text, background]) => {
    const ratio = new Color(colors[text]).contrast(new Color(colors[background]), "WCAG21");
    return ratio >= AA
      ? []
      : [{ path: `/colors/${text}`, message: `contrast is ${ratio.toFixed(1)}:1 on ${background}; WCAG AA needs ${AA}:1` }];
  });
}
