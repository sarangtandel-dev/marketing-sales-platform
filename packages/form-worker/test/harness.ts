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

// Stands in for the send_email binding (Cloudflare Email Routing). Each send() is
// forwarded through a service binding to the test's recorder, which can make it fail.
const FAKE_MAILER = `
export default function (env) {
  return {
    async send(message) {
      const res = await env.RECORDER.fetch("https://mailer.fake/send", { method: "POST", body: JSON.stringify(message) });
      if (!res.ok) throw Object.assign(new Error("send failed"), { code: "E_FAKE" });
      return { messageId: "fake-" + crypto.randomUUID() };
    },
  };
}`;

export type SentEmail = { from: string; to: string; subject: string; text: string };

export type Harness = {
  mf: Miniflare;
  post: (body: unknown, init?: { origin?: string }) => Promise<Response>;
  rows: (sql?: string) => Promise<Record<string, unknown>[]>;
  requests: Request[];
  emails: SentEmail[];
  // Waits for background work (ctx.waitUntil) to reach a state the check accepts.
  eventually: <T>(check: () => Promise<T | undefined | false>, timeoutMs?: number) => Promise<T>;
  // Runs the Worker's scheduled handler as if the cron `schedule` fired at `at`.
  cron: (at: Date, schedule?: string) => Promise<void>;
  dispose: () => Promise<void>;
};

export async function startWorker(
  opts: { outbound?: Record<string, Outbound>; bindings?: Record<string, string>; mailerFails?: boolean } = {},
): Promise<Harness> {
  const emails: SentEmail[] = [];
  const recorder = async (request: { json(): Promise<unknown> }) => {
    if (opts.mailerFails) return new Response("down", { status: 500 }) as never;
    emails.push((await request.json()) as SentEmail);
    return new Response("ok") as never;
  };
  const handlers: Record<string, Outbound> = {
    "challenges.cloudflare.com": fakeTurnstile,
    ...opts.outbound,
  };
  const requests: Request[] = [];
  const outboundService = async (request: { url: string; clone(): unknown }) => {
    requests.push(request.clone() as Request);
    const handler = handlers[new URL(request.url).hostname];
    if (!handler) return new Response(`no fake for ${request.url}`, { status: 599 }) as never;
    return (await handler(request as unknown as Request)) as never;
  };

  const mf = new Miniflare({
    workers: [
      {
        name: "form-worker",
        modules: true,
        script: await bundleWorker(),
        compatibilityDate: COMPATIBILITY_DATE,
        d1Databases: ["LEAD_LOG"],
        bindings: {
          TURNSTILE_SECRET_KEY: "test-secret",
          ALLOWED_ORIGINS: "https://example.test",
          ALERT_FROM: "alerts@agency.test",
          ALERT_TO: "owner@agency.test",
          BREVO_API_KEY: "brevo-test-key",
          ...opts.bindings,
        },
        wrappedBindings: { OWNER_ALERT: "fake-mailer" },
        outboundService,
      },
      {
        // Wrapped-binding workers can't set a compatibility date or an outbound service.
        name: "fake-mailer",
        modules: true,
        script: FAKE_MAILER,
        serviceBindings: { RECORDER: recorder },
      },
    ],
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
    emails,
    eventually: async (check, timeoutMs = 5000) => {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const value = await check();
        if (value) return value as never;
        if (Date.now() > deadline) throw new Error("condition not reached in time");
        await new Promise((r) => setTimeout(r, 25));
      }
    },
    cron: async (at, schedule = "*/5 * * * *") => {
      const worker = await mf.getWorker("form-worker");
      await worker.scheduled({ scheduledTime: at, cron: schedule });
    },
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

// A fake Brevo API: answers each POST /v3/contacts with the next queued status
// (200 once the queue is empty) and records the request bodies.
export function fakeBrevo(statuses: number[] = []) {
  const calls: { apiKey: string | null; body: Record<string, unknown> }[] = [];
  const handler: Outbound = async (request) => {
    if (new URL(request.url).pathname !== "/v3/contacts") return new Response("not found", { status: 404 });
    calls.push({ apiKey: request.headers.get("api-key"), body: await request.json() });
    const status = statuses.shift() ?? 201;
    return status < 300
      ? Response.json({ id: 42 }, { status })
      : Response.json({ code: "error", message: `status ${status}` }, { status });
  };
  return { calls, handler };
}
