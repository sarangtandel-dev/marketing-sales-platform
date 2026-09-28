import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  type Issue,
  type SiteDefinition,
  type Theme,
  validateSiteDefinition,
  validateTheme,
} from "./definition.ts";

export class SiteDefinitionError extends Error {
  constructor(file: string, issues: Issue[]) {
    super(`${file} is invalid:\n${issues.map((i) => `  ${i.path || "(root)"}: ${i.message}`).join("\n")}`);
    this.name = "SiteDefinitionError";
  }
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new SiteDefinitionError(file, [{ path: "", message: (err as Error).message }]);
  }
}

// Reads a Client's site definition and the Theme it references, and validates both.
export function loadSite(siteDir: string): { site: SiteDefinition; theme: Theme } {
  const siteFile = resolve(siteDir, "site-definition.json");
  const site = readJson(siteFile);
  const siteIssues = validateSiteDefinition(site);
  if (siteIssues.length) throw new SiteDefinitionError(siteFile, siteIssues);

  const themeFile = resolve(dirname(siteFile), (site as SiteDefinition).meta.theme);
  const theme = readJson(themeFile);
  const themeIssues = validateTheme(theme);
  if (themeIssues.length) throw new SiteDefinitionError(themeFile, themeIssues);

  // Local font files are resolved against the Theme file, and must exist.
  const fonts = (theme as Theme).fonts ?? {};
  const missing: Issue[] = [];
  for (const [token, font] of Object.entries(fonts)) {
    if (font.provider !== "local") continue;
    font.files.forEach((file, i) => {
      file.src = resolve(dirname(themeFile), file.src);
      if (!existsSync(file.src)) missing.push({ path: `/fonts/${token}/files/${i}/src`, message: `no such file: ${file.src}` });
    });
  }
  if (missing.length) throw new SiteDefinitionError(themeFile, missing);

  // Section images must exist; they're processed by the build (resized, modern formats).
  const imageIssues: Issue[] = [];
  (site as SiteDefinition).pages.forEach((page, p) =>
    page.sections.forEach((section, s) => {
      if (section.image && !existsSync(resolve(dirname(siteFile), section.image.src))) {
        imageIssues.push({ path: `/pages/${p}/sections/${s}/image/src`, message: `no such file: ${section.image.src}` });
      }
    }),
  );
  if (imageIssues.length) throw new SiteDefinitionError(siteFile, imageIssues);

  return { site: site as SiteDefinition, theme: theme as Theme };
}
