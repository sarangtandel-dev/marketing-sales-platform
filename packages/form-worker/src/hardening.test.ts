import { afterEach, describe, expect, it } from "vitest";
import { fakeBrevo, type Harness, startWorker, submission } from "../test/harness.ts";

// Regression tests for the Phase 1 hardening after the 2026-09-28 system audit.
let w: Harness;
afterEach(() => w.dispose());

describe("rate limiting (audit security M1)", () => {
  it("returns 429 once an IP goes over its limit, before reading the body or touching D1", async () => {
    w = await startWorker({ rateLimit: 2 });
    expect((await w.post(submission(), { ip: "203.0.113.9" })).status).toBe(200);
    expect((await w.post(submission(), { ip: "203.0.113.9" })).status).toBe(200);
    const limited = await w.post(submission(), { ip: "203.0.113.9" });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ ok: false, error: "rate_limited" });
    expect((await w.post(submission(), { ip: "198.51.100.7" })).status).toBe(200);
    expect(await w.rows()).toHaveLength(3);
    expect(await w.rows("SELECT * FROM spam_counts")).toEqual([]);
  });
});

describe("Turnstile hostname binding (audit security L2)", () => {
  it("rejects a token solved on a site this Worker doesn't serve", async () => {
    w = await startWorker();
    const res = await w.post(submission({ turnstile_token: "turnstile-pass@other-client.test" }));
    expect(res.status).toBe(400);
    expect(await w.rows()).toEqual([]);
  });

  it("accepts a token solved on a branch preview matched by a wildcard origin", async () => {
    w = await startWorker({ bindings: { ALLOWED_ORIGINS: "https://example.test,https://*.fixture.pages.dev" } });
    const res = await w.post(submission({ turnstile_token: "turnstile-pass@main.fixture.pages.dev" }), {
      origin: "https://main.fixture.pages.dev",
    });
    expect(res.status).toBe(200);
  });
});

describe("request size", () => {
  it("rejects a declared oversized body with 413 before reading it", async () => {
    w = await startWorker();
    const res = await w.mf.dispatchFetch("https://forms.example.test/lead", {
      method: "POST",
      headers: { origin: "https://example.test", "content-type": "application/json", "content-length": "70000" },
      body: "x".repeat(70_000),
    });
    expect(res.status).toBe(413);
  });
});

describe("health route", () => {
  it("answers HEAD as well as GET, so any uptime monitor works", async () => {
    w = await startWorker();
    expect((await w.mf.dispatchFetch("https://forms.example.test/health", { method: "HEAD" })).status).toBe(200);
    expect((await w.mf.dispatchFetch("https://forms.example.test/health")).status).toBe(200);
  });
});

describe("preview Worker without a Brevo key (audit security H1)", () => {
  it("marks delivery skipped instead of failing, and sends no not-delivered alert", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler }, bindings: { BREVO_API_KEY: "" } });
    await w.post(submission());
    const row = await w.eventually(async () => {
      const [r] = await w.rows();
      return r?.delivery_status === "skipped" && r.alert_status === "sent" ? r : undefined;
    });
    expect(row.delivery_status).toBe("skipped");
    expect(brevo.calls).toEqual([]);
    expect(w.emails.filter((e) => e.subject.includes("not delivered"))).toEqual([]);
  });
});

describe("Client on each Lead (audit architecture #6)", () => {
  it("records which Client the Lead belongs to", async () => {
    w = await startWorker();
    await w.post(submission());
    expect((await w.rows())[0].client).toBe("fixture");
  });
});
