import { join } from "node:path";
import { buildSync } from "esbuild";
import { JSDOM } from "jsdom";

// Seam 3 harness: the real bundled tracking script in a browser page (jsdom) with a
// chosen URL, referrer, stored state and cookies. Consent is given the way a consent
// tool does it: gtag("consent", "update", …) through the dataLayer.

const bundle = buildSync({
  entryPoints: [join(import.meta.dirname, "../src/index.ts")],
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
}).outputFiles[0].text;

export type PageOptions = {
  url: string;
  referrer?: string;
  storage?: Record<string, string>;
  cookie?: string;
  html?: string;
  consent?: { analytics_storage?: "granted" | "denied"; ad_storage?: "granted" | "denied" };
  // window.mspConfig, as the site layout writes it (the GTM container ID).
  config?: { gtm?: string | null };
};

export type Page = {
  window: JSDOM["window"];
  storage: () => Record<string, unknown>;
  dataLayer: () => unknown[];
  grant: (consent: PageOptions["consent"]) => void;
  click: (selector: string) => void;
};

export function openPage(opts: PageOptions): Page {
  const dom = new JSDOM(opts.html ?? "<!doctype html><body></body>", {
    url: opts.url,
    referrer: opts.referrer,
    runScripts: "outside-only",
  });
  const { window } = dom;
  for (const [k, v] of Object.entries(opts.storage ?? {})) window.localStorage.setItem(k, v);
  if (opts.cookie) window.document.cookie = opts.cookie;

  // What a consent tool does before our script runs: Consent Mode defaults, then any
  // choice the Visitor already made on an earlier page.
  const gtag = (...args: unknown[]) => (window as unknown as { dataLayer: unknown[] }).dataLayer.push(args);
  window.eval("window.dataLayer = window.dataLayer || [];");
  if (opts.config) window.eval(`window.mspConfig = ${JSON.stringify(opts.config)};`);
  gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied" });
  if (opts.consent) gtag("consent", "update", opts.consent);

  window.eval(bundle);

  return {
    window,
    storage: () => {
      const out: Record<string, unknown> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)!;
        out[key] = JSON.parse(window.localStorage.getItem(key)!);
      }
      return out;
    },
    dataLayer: () => (window as unknown as { dataLayer: unknown[] }).dataLayer,
    grant: (consent) => gtag("consent", "update", consent),
    click: (selector) => window.document.querySelector<HTMLElement>(selector)!.click(),
  };
}

// Carries browser storage to the next page, as a real return visit would.
export const storageOf = (page: Page) =>
  Object.fromEntries(Object.entries(page.storage()).map(([k, v]) => [k, JSON.stringify(v)]));

export const ALL = { analytics_storage: "granted", ad_storage: "granted" } as const;
