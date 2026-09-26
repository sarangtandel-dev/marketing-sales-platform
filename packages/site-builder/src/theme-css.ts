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

export function themeCss(theme: Theme, sources: string[]): string {
  const vars = Object.entries(namespaces).flatMap(([group, ns]) =>
    Object.entries(theme[group as keyof Theme] ?? {}).map(([name, value]) => `  --${ns}-${name}: ${value};`),
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
