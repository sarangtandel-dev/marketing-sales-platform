import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { build } from "astro";
import { loadSite } from "./load.ts";
import { themeCss } from "./theme-css.ts";

const packageDir = fileURLToPath(new URL("..", import.meta.url));
const appDir = join(packageDir, "app");
const componentsDir = dirname(fileURLToPath(import.meta.resolve("@msp/components/catalog")));

const SITE_MODULE = "virtual:msp/site";

// Builds one Client's static site from its site definition directory into outDir.
// Throws SiteDefinitionError, before anything is written, if the input is invalid.
export async function buildSite({ siteDir, outDir }: { siteDir: string; outDir: string }) {
  const { site, theme } = loadSite(siteDir);

  // Per-build scratch space inside the package, so Astro and Tailwind resolve from its node_modules.
  const scratch = join(packageDir, ".build");
  mkdirSync(scratch, { recursive: true });
  const work = mkdtempSync(join(scratch, `${site.meta.client}-`));
  const themeFile = join(work, "theme.css");
  writeFileSync(themeFile, themeCss(theme, [appDir, componentsDir]));

  try {
    await build({
      configFile: false,
      root: work,
      srcDir: appDir,
      outDir: resolve(outDir),
      site: site.meta.site_url,
      logLevel: "error",
      vite: {
        plugins: [
          tailwindcss(),
          {
            name: "msp-site",
            resolveId: (id) => (id === SITE_MODULE ? `\0${SITE_MODULE}` : undefined),
            load: (id) =>
              id === `\0${SITE_MODULE}` ? `export const site = ${JSON.stringify(site)};` : undefined,
          },
        ],
        resolve: { alias: { "msp:theme.css": themeFile } },
      },
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
