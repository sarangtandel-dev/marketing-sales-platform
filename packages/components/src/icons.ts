import { icons } from "@iconify-json/lucide";

// Item icons: one set (Lucide, ISC), inlined as SVG at build time, so there are no icon
// requests or scripts at runtime. The SVG is decorative: the item's title says what it is.
// ponytail: one icon set. Add another only when a Client needs it.
// Own keys only: "constructor" and friends aren't icons.
const resolveName = (name: string): string | undefined =>
  Object.hasOwn(icons.icons, name)
    ? name
    : icons.aliases && Object.hasOwn(icons.aliases, name)
      ? icons.aliases[name].parent
      : undefined;

export const iconExists = (name: string) => resolveName(name) !== undefined;

export function iconSvg(name: string): string | undefined {
  const key = resolveName(name);
  if (!key) return undefined;
  const icon = icons.icons[key];
  const width = icon.width ?? icons.width ?? 24;
  const height = icon.height ?? icons.height ?? 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="1.5em" height="1.5em" aria-hidden="true" focusable="false">${icon.body}</svg>`;
}
