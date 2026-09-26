import type { APIRoute } from "astro";
import { languages, pagePath, publicPages, site } from "../lib/site";

export const GET: APIRoute = () => {
  const urls = languages.flatMap((lang) =>
    publicPages().map((page) => `  <url><loc>${new URL(pagePath(page, lang), site.meta.site_url).href}</loc></url>`),
  );
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
