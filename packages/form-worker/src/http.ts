export function allowedOrigin(request: Request, allowed: string): string | null | false {
  const origin = request.headers.get("origin");
  if (!origin) return null; // server-to-server calls (monitoring) send no Origin
  const list = allowed.split(",").map((o) => o.trim()).filter(Boolean);
  return list.includes(origin) ? origin : false;
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
