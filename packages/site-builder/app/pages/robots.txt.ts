import type { APIRoute } from "astro";
import { site } from "../lib/site";

// Production is always indexable (ADR-0027); previews are noindex through Cloudflare's header.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site.meta.site_url).href}\n`, {
    headers: { "Content-Type": "text/plain" },
  });
