import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

// Seam 2 harness: the real Worker bundle in Miniflare with a local D1 Lead Log.
// Outside services are faked at their HTTP boundary through `outbound`.

const root = join(import.meta.dirname, "..");

// Must match wrangler.jsonc, and be one the pinned Miniflare runtime supports.
export const COMPATIBILITY_DATE = "2026-08-01";

let bundle: Promise<string> | undefined;
function bundleWorker(): Promise<string> {
  bundle ??= build({
    entryPoints: [join(root, "src/index.ts")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  }).then((r) => r.outputFiles[0].text);
  return bundle;
}

export const TURNSTILE_PASS = "turnstile-pass";

export type Outbound = (request: Request) => Promise<Response> | Response;

// Turnstile's siteverify: tokens equal to TURNSTILE_PASS succeed, anything else fails.
export const fakeTurnstile: Outbound = async (request) => {
  const body = await request.formData();
  const success = body.get("response") === TURNSTILE_PASS && body.get("secret") === "test-secret";
  return Response.json({ success, "error-codes": success ? [] : ["invalid-input-response"] });
};

export type Harness = {
  mf: Miniflare;
  post: (body: unknown, init?: { origin?: string }) => Promise<Response>;
  rows: (sql?: string) => Promise<Record<string, unknown>[]>;
  requests: Request[];
  dispose: () => Promise<void>;
};

export async function startWorker(
  opts: { outbound?: Record<string, Outbound>; bindings?: Record<string, string> } = {},
): Promise<Harness> {
  const handlers: Record<string, Outbound> = {
    "challenges.cloudflare.com": fakeTurnstile,
    ...opts.outbound,
  };
  const requests: Request[] = [];

  const mf = new Miniflare({
    modules: true,
    script: await bundleWorker(),
    compatibilityDate: COMPATIBILITY_DATE,
    d1Databases: ["LEAD_LOG"],
    bindings: {
      TURNSTILE_SECRET_KEY: "test-secret",
      ALLOWED_ORIGINS: "https://example.test",
      ...opts.bindings,
    },
    outboundService: async (request) => {
      requests.push(request.clone() as unknown as Request);
      const handler = handlers[new URL(request.url).hostname];
      if (!handler) return new Response(`no fake for ${request.url}`, { status: 599 });
      return (await handler(request as unknown as Request)) as never;
    },
  });

  const db = await mf.getD1Database("LEAD_LOG");
  for (const file of readdirSync(join(root, "migrations")).sort()) {
    const sql = readFileSync(join(root, "migrations", file), "utf8");
    for (const statement of sql.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }

  return {
    mf,
    requests,
    post: (body, init = {}) =>
      mf.dispatchFetch("https://forms.example.test/lead", {
        method: "POST",
        headers: { "content-type": "application/json", origin: init.origin ?? "https://example.test" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }) as unknown as Promise<Response>,
    rows: async (sql = "SELECT * FROM leads ORDER BY created_at") =>
      (await db.prepare(sql).all()).results as Record<string, unknown>[],
    dispose: () => mf.dispose(),
  };
}

let seq = 0;
export function submission(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return {
    form_id: "contact",
    form_type: "consultation_request",
    submission_token: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    fields: { name: "Asha", email: "asha@example.test", message: "We need a website." },
    honeypot: "",
    turnstile_token: TURNSTILE_PASS,
    page_url: "https://example.test/contact/",
    language: "en",
    ...overrides,
  };
}
