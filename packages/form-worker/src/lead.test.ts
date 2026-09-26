import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Harness, startWorker, submission } from "../test/harness.ts";

let w: Harness;
beforeEach(async () => {
  w = await startWorker();
});
afterEach(() => w.dispose());

describe("POST /lead", () => {
  it("stores the Lead in the Lead Log and returns its lead ID", async () => {
    const res = await w.post(submission());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; lead_id: string };
    expect(body.ok).toBe(true);

    const [row] = await w.rows();
    expect(row.id).toBe(body.lead_id);
    expect(row.form_id).toBe("contact");
    expect(row.form_type).toBe("consultation_request");
    expect(JSON.parse(row.fields as string)).toEqual({
      name: "Asha",
      email: "asha@example.test",
      message: "We need a website.",
    });
    expect(row.page_url).toBe("https://example.test/contact/");
    expect(row.language).toBe("en");
    expect(row.is_test).toBe(0);
  });

  it("verifies the Turnstile token server-side with the secret key", async () => {
    await w.post(submission());
    const verify = w.requests.find((r) => r.url.includes("challenges.cloudflare.com"));
    expect(verify?.url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  });

  it("rejects a failed Turnstile check without storing anything", async () => {
    const res = await w.post(submission({ turnstile_token: "bot" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "rejected" });
    expect(await w.rows()).toEqual([]);
  });

  it("rejects a filled honeypot without storing anything or calling Turnstile", async () => {
    const res = await w.post(submission({ honeypot: "http://spam.example" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "rejected" });
    expect(await w.rows()).toEqual([]);
    expect(w.requests).toEqual([]);
  });

  it("maps a resubmission with the same token to the same lead ID", async () => {
    const s = submission();
    const first = (await (await w.post(s)).json()) as { lead_id: string };
    const second = (await (await w.post(s)).json()) as { lead_id: string };
    expect(second.lead_id).toBe(first.lead_id);
    expect(await w.rows()).toHaveLength(1);
  });

  it("returns an error the Visitor can retry when the Lead Log write fails", async () => {
    await w.rows("DROP TABLE leads");
    const res = await w.post(submission());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "unavailable" });
  });

  it("rejects malformed submissions", async () => {
    for (const bad of [
      "not json",
      submission({ submission_token: "short" }),
      submission({ fields: { name: 42 } }),
      submission({ fields: { big: "x".repeat(5001) } }),
      submission({ form_id: undefined }),
    ]) {
      const res = await w.post(bad);
      expect(res.status, JSON.stringify(bad).slice(0, 80)).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "invalid" });
    }
    expect(await w.rows()).toEqual([]);
  });

  it("refuses requests from origins that aren't allowed", async () => {
    const res = await w.post(submission(), { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(await w.rows()).toEqual([]);
  });

  it("allows the site's origin through CORS", async () => {
    const res = await w.post(submission());
    expect(res.headers.get("access-control-allow-origin")).toBe("https://example.test");

    const preflight = await w.mf.dispatchFetch("https://forms.example.test/lead", {
      method: "OPTIONS",
      headers: { origin: "https://example.test", "access-control-request-method": "POST" },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("answers only POST /lead", async () => {
    expect((await w.mf.dispatchFetch("https://forms.example.test/lead")).status).toBe(405);
    expect((await w.mf.dispatchFetch("https://forms.example.test/other", { method: "POST" })).status).toBe(404);
  });
});
