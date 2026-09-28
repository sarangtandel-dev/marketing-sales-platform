// Runs a Client's site and the form Worker locally, the way Cloudflare serves them.
// Usage: pnpm dev [clients/<slug>]   (default: clients/client-zero)
//
// The Worker runs in `wrangler dev` on a local Lead Log with Turnstile's always-pass test
// secret and no Brevo key (Leads are stored, never delivered). The site is a preview build
// posting to it, served by `wrangler pages dev` so _headers and _redirects apply.
import { spawn, spawnSync } from "node:child_process";
import { basename, join, resolve } from "node:path";

const client = resolve(process.argv[2] ?? "clients/client-zero");
const worker = resolve("packages/form-worker");
const out = resolve("dist", `dev-${basename(client)}`);
const WORKER_PORT = 8787;
const SITE_PORT = 8788;
// Cloudflare's published Turnstile test secret that always passes.
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

// No wrangler telemetry: on a slow network its upload keeps each command open for minutes.
const env = { ...process.env, WRANGLER_SEND_METRICS: "false" };

const run = (cmd: string, args: string[], cwd = process.cwd()) => {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", "LEAD_LOG", "--local"], worker);
run("node", [
  "packages/site-builder/src/cli.ts",
  join(client, "site"),
  out,
  "--preview",
  "--form-endpoint",
  `http://localhost:${WORKER_PORT}/lead`,
]);

const children = [
  spawn(
    "pnpm",
    [
      "exec", "wrangler", "dev", "--port", String(WORKER_PORT),
      "--var", `ALLOWED_ORIGINS:http://localhost:${SITE_PORT}`,
      "--var", `TURNSTILE_SECRET_KEY:${TURNSTILE_TEST_SECRET}`,
      "--var", "TURNSTILE_SKIP_HOSTNAME:true",
    ],
    { cwd: worker, stdio: "inherit", env },
  ),
  // Its own debugger port: both wrangler processes default to the same one.
  spawn("pnpm", ["exec", "wrangler", "pages", "dev", out, "--port", String(SITE_PORT), "--inspector-port", "9230"], {
    stdio: "inherit",
    env,
  }),
];
const stop = () => children.forEach((c) => c.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const c of children) c.on("exit", stop);
