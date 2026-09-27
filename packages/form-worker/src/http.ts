export function allowedOrigin(request: Request, allowed: string): string | null | false {
  const origin = request.headers.get("origin");
  if (!origin) return null; // server-to-server calls (monitoring) send no Origin
  const list = allowed.split(",").map((o) => o.trim()).filter(Boolean);
  return list.some((entry) => originMatches(entry, origin)) ? origin : false;
}

// An entry is an exact origin, or "https://*.<host>" for any single-label subdomain of it
// (a Pages project's branch previews, e.g. https://*.client-zero.pages.dev).
function originMatches(entry: string, origin: string): boolean {
  const wildcard = entry.match(/^(https?):\/\/\*\.(.+)$/);
  if (!wildcard) return entry === origin;
  const [, scheme, host] = wildcard;
  const prefix = `${scheme}://`;
  if (!origin.startsWith(prefix) || !origin.endsWith(`.${host}`)) return false;
  const label = origin.slice(prefix.length, origin.length - host.length - 1);
  return /^[a-z0-9-]+$/i.test(label);
}

// Whether a Turnstile token's hostname belongs to one of our allowed origins.
export function hostAllowed(host: string, allowed: string): boolean {
  const list = allowed.split(",").map((o) => o.trim()).filter(Boolean);
  return list.some((entry) => originMatches(entry.replace(/^http:/, "https:"), `https://${host}`));
}

export function corsHeaders(origin: string | null): Record<string, string> {
  return origin
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
        vary: "origin",
      }
    : {};
}

export const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers });
