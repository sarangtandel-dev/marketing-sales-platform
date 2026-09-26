import { afterEach, describe, expect, it } from "vitest";
import { fakeBrevo, type Harness, signTest, startWorker, submission } from "../test/harness.ts";
import { DAILY_CRON } from "./schedules.ts";

let w: Harness;
afterEach(() => w.dispose());

const testLead = () => submission({ turnstile_token: "", fields: { email: "monitor@agency.test", name: "Daily test" } });

describe("the signed test path", () => {
  it("accepts a signed test Lead without Turnstile and marks it as a test", async () => {
    w = await startWorker();
    const body = JSON.stringify(testLead());
    const res = await w.post(body, { origin: "", headers: { "x-msp-test-signature": await signTest(body) } });
    expect(res.status).toBe(200);
    const [row] = await w.rows();
    expect(row.is_test).toBe(1);
    expect(w.requests.some((r) => r.url.includes("challenges.cloudflare.com"))).toBe(false);
  });

  it("never sends the owner alert for a test Lead", async () => {
    w = await startWorker();
    const body = JSON.stringify(testLead());
    await w.post(body, { origin: "", headers: { "x-msp-test-signature": await signTest(body) } });
    await w.eventually(async () => (await w.rows())[0]?.delivery_status !== "pending");
    expect(w.emails).toEqual([]);
  });

  it("rejects a wrong, tampered or stale signature", async () => {
    w = await startWorker();
    const body = JSON.stringify(testLead());
    const tampered = JSON.stringify({ ...testLead(), form_id: "other" });
    for (const signature of [
      await signTest(body, undefined, "wrong-secret"),
      await signTest(tampered),
      await signTest(body, Math.floor(Date.now() / 1000) - 600),
      "t=1,v1=00",
    ]) {
      const res = await w.post(body, { origin: "", headers: { "x-msp-test-signature": signature } });
      expect(res.status, signature).toBe(403);
    }
    expect(await w.rows()).toEqual([]);
  });
});

describe("health route", () => {
  it("answers OK without writing anything", async () => {
    w = await startWorker();
    const res = await w.mf.dispatchFetch("https://forms.example.test/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await w.rows()).toEqual([]);
  });
});

describe("the daily test Lead", () => {
  it("passes quietly when the Lead reaches the Lead Log and Brevo, then cleans up", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.cron(new Date(), DAILY_CRON);
    expect(brevo.calls).toHaveLength(1);
    expect(brevo.calls[0].body.email).toBe("monitor@agency.test");
    expect(brevo.calls[0].body).not.toHaveProperty("listIds");
    expect(brevo.deleted).toEqual(["monitor@agency.test"]);
    expect(await w.rows()).toEqual([]);
    expect(w.emails).toEqual([]);
  });

  it.each([500, 401])("alerts once when Brevo answers %i, and still cleans up", async (status) => {
    const brevo = fakeBrevo([status]);
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.cron(new Date(), DAILY_CRON);
    const alert = w.emails.find((e) => e.subject.includes("Daily test Lead failed"));
    expect(alert?.text).toContain("Brevo");
    // One email about the check, not a second per-Lead "not delivered" alert.
    expect(w.emails).toHaveLength(1);
    expect(await w.rows("SELECT * FROM leads WHERE is_test = 1")).toEqual([]);
  });

  it("alerts when the test Lead can't be stored", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler } });
    await w.rows("DROP TABLE leads");
    await w.cron(new Date(), DAILY_CRON);
    const alert = w.emails.find((e) => e.subject.includes("Daily test Lead failed"));
    expect(alert?.text).toContain("Lead Log");
  });
});
