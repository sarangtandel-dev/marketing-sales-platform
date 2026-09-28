import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { type AstroUserConfig, build } from "astro";
import { fontProviders } from "astro/config";
import { loadSite, SiteDefinitionError } from "./load.ts";
import type { Theme } from "./definition.ts";
import { fontVariable, themeCss } from "./theme-css.ts";

const packageDir = fileURLToPath(new URL("..", import.meta.url));
const appDir = join(packageDir, "app");
const componentsDir = dirname(fileURLToPath(import.meta.resolve("@msp/components/catalog")));

const SITE_MODULE = "virtual:msp/site";
const IMAGES_MODULE = "virtual:msp/images";

// Cloudflare's published Turnstile test site key that always passes (ADR-0028: never
// use a production widget outside production).
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export type BuildOptions = {
  siteDir: string;
  outDir: string;
  // A preview build uses Turnstile's test key and, if given, a preview form endpoint.
  preview?: boolean;
  formEndpoint?: string;
};

/** @public Used by app/env.d.ts, which knip can't see. */
export type BuildSettings = {
  turnstileSiteKey?: string;
  formEndpoint?: string;
  favicon?: string;
  // The social preview image and the logo in the Client's public/ folder, if any.
  ogImage?: string;
  logo?: string;
  fonts: string[];
  themeColor: string;
};

// Astro's Fonts API config for the Theme's web fonts: downloaded or copied at build time and
// served from the site itself, so Visitors never contact a font host (ADR-0020). The type
// token's own value becomes the fallback stack.
function fontsConfig(theme: Theme) {
  return Object.entries(theme.fonts ?? {}).map(([token, font]) => {
    const family = {
      name: font.family,
      cssVariable: fontVariable(token) as `--${string}`,
      fallbacks: theme.type[token].split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")),
    };
    return font.provider === "local"
      ? {
          ...family,
          provider: fontProviders.local(),
          options: { variants: font.files.map((f) => ({ src: [f.src], weight: f.weight, style: f.style })) },
        }
      : { ...family, provider: fontProviders.fontsource(), weights: font.weights ?? ["400", "700"], styles: font.styles ?? ["normal"] };
  });
}

// Sent with every page by Cloudflare Pages (audit M4). The CSP is header-only rules that
// can't break a script: no framing (clickjacking), no <base> or plugin injection.
// ponytail: no script-src/style-src policy yet. CookieYes and GTM inject scripts and inline
// styles, and Astro's hash-based CSP would block them; the site renders no user input, so
// the gain is small. Upgrade path: Astro security.csp with strict-dynamic, checked in a
// browser against CookieYes, GTM and Turnstile (issue 42).
const HEADERS = `/*
  Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000
`;

// Builds one Client's static site from its site definition directory into outDir.
// Throws SiteDefinitionError, before anything is written, if the input is invalid.
export async function buildSite({ siteDir, outDir, preview = false, formEndpoint }: BuildOptions) {
  const { site, theme } = loadSite(siteDir);
  // The Client's own static files (favicon and the like) are copied as they are.
  const publicDir = join(resolve(siteDir), "public");
  const settings: BuildSettings = {
    turnstileSiteKey: preview ? TURNSTILE_TEST_SITE_KEY : site.meta.turnstile_site_key,
    formEndpoint,
    favicon: ["favicon.svg", "favicon.ico"].find((f) => existsSync(join(publicDir, f))),
    ogImage: ["og.png", "og.jpg"].find((f) => existsSync(join(publicDir, f))),
    logo: ["logo.svg", "logo.png"].find((f) => existsSync(join(publicDir, f))),
    fonts: Object.keys(theme.fonts ?? {}),
    themeColor: theme.colors.primary,
  };
  // The business name is the logo's alt text.
  if (settings.logo && !site.meta.name) {
    throw new SiteDefinitionError(join(resolve(siteDir), "site-definition.json"), [
      { path: "/meta/name", message: `is needed as the logo's alt text, because public/${settings.logo} exists` },
    ]);
  }
  // Every section image, imported so astro:assets can resize it and serve modern formats.
  const imageSrcs = [...new Set(site.pages.flatMap((p) => p.sections.flatMap((s) => (s.image ? [s.image.src] : []))))];
  const imagesModule = [
    ...imageSrcs.map((src, i) => `import i${i} from ${JSON.stringify(resolve(siteDir, src))};`),
    `export const images = {${imageSrcs.map((src, i) => `${JSON.stringify(src)}: i${i}`).join(", ")}};`,
  ].join("\n");

  // Per-build scratch space inside the package, so Astro and Tailwind resolve from its node_modules.
  const scratch = join(packageDir, ".build");
  mkdirSync(scratch, { recursive: true });
  const work = mkdtempSync(join(scratch, `${site.meta.client}-`));
  const themeFile = join(work, "theme.css");
  writeFileSync(themeFile, themeCss(theme, [appDir, componentsDir]));

  // Astro puts its pre-render chunk in the current directory when the output is outside it,
  // and that chunk loads sharp (image processing) from there. Build from this package, so
  // it always finds ours, wherever the CLI is run from.
  const cwd = process.cwd();
  const out = resolve(outDir);
  process.chdir(packageDir);
  try {
    await build({
      configFile: false,
      root: work,
      srcDir: appDir,
      publicDir,
      // Each family is typed by its own provider; Astro's config type only accepts one provider
      // type per array position, so the mixed list is cast here.
      fonts: fontsConfig(theme) as NonNullable<AstroUserConfig["fonts"]>,
      outDir: out,
      site: site.meta.site_url,
      logLevel: "error",
      vite: {
        plugins: [
          tailwindcss(),
          {
            name: "msp-site",
            resolveId: (id) => (id === SITE_MODULE || id === IMAGES_MODULE ? `\0${id}` : undefined),
            load: (id) => {
              if (id === `\0${SITE_MODULE}`) {
                return `export const site = ${JSON.stringify(site)};\nexport const settings = ${JSON.stringify(settings)};`;
              }
              if (id === `\0${IMAGES_MODULE}`) return imagesModule;
            },
          },
        ],
        resolve: { alias: { "msp:theme.css": themeFile } },
      },
    });
  } finally {
    process.chdir(cwd);
    rmSync(work, { recursive: true, force: true });
  }
  writeFileSync(join(outDir, "_headers"), HEADERS);
  const redirects = (site.redirects ?? []).map((r) => `${r.from} ${r.to} 301\n`).join("");
  if (redirects) writeFileSync(join(outDir, "_redirects"), redirects);
}
