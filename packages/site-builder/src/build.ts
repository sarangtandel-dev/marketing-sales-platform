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

// Cloudflare's published Turnstile test site key that always passes (ADR-0028: never
// use a production widget outside production).
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export type BuildOptions = {
  siteDir: string;
  outDir: string;
  // A preview build uses Turnstile's test key and, if given, a preview form endpoint.
  preview?: boolean;
  formEndpoint?: string;
};

export type BuildSettings = { turnstileSiteKey?: string; formEndpoint?: string };

// Builds one Client's static site from its site definition directory into outDir.
// Throws SiteDefinitionError, before anything is written, if the input is invalid.
export async function buildSite({ siteDir, outDir, preview = false, formEndpoint }: BuildOptions) {
  const { site, theme } = loadSite(siteDir);
  const settings: BuildSettings = {
    turnstileSiteKey: preview ? TURNSTILE_TEST_SITE_KEY : site.meta.turnstile_site_key,
    formEndpoint,
  };

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
              id === `\0${SITE_MODULE}`
                ? `export const site = ${JSON.stringify(site)};\nexport const settings = ${JSON.stringify(settings)};`
                : undefined,
          },
        ],
        resolve: { alias: { "msp:theme.css": themeFile } },
      },
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
