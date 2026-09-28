import type { Theme } from "./definition.ts";

// Theme token groups map onto Tailwind's theme namespaces, so components use
// classes like `bg-primary`, `font-heading` or `rounded-card` and never raw values.
const namespaces = {
  colors: "color",
  type: "font",
  spacing: "spacing",
  radius: "radius",
  shadows: "shadow",
} as const;

// The CSS variable Astro's Fonts API sets for a type token's web font.
export const fontVariable = (token: string) => `--msp-font-${token}`;

export function themeCss(theme: Theme, sources: string[]): string {
  const vars = Object.entries(namespaces).flatMap(([group, ns]) =>
    Object.entries(theme[group as keyof typeof namespaces] ?? {}).map(([name, value]) =>
      // A type token with a web font points at it; Astro adds the fallback stack.
      group === "type" && theme.fonts?.[name]
        ? `  --${ns}-${name}: var(${fontVariable(name)});`
        : `  --${ns}-${name}: ${value};`,
    ),
  );
  return [
    '@import "tailwindcss";',
    ...sources.map((dir) => `@source "${dir}";`),
    "@theme {",
    ...vars,
    "}",
    "",
  ].join("\n");
}
