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
    const alert = w.emails.find((e) => e.subject.includes("Daily check failed"));
    expect(alert?.text).toContain("Brevo");
    // One email about the check, not a second per-Lead "not delivered" alert.
    expect(w.emails).toHaveLength(1);
    expect(await w.rows("SELECT * FROM leads WHERE is_test = 1")).toEqual([]);
  });

  it("alerts when the test Lead can't be stored", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler } });
    await w.rows("DROP TABLE leads");
    await w.cron(new Date(), DAILY_CRON);
    const alert = w.emails.find((e) => e.subject.includes("Daily check failed"));
    expect(alert?.text).toContain("Lead Log");
  });
});

// The daily check's wider net (audit A3): the paths the test Lead used to skip, Leads the
// owner was never told about, Turnstile rejection spikes, and a heartbeat for silence.
describe("the daily checks", () => {
  const recorder = () => {
    const seen: { url: string; body: string; title: string | null }[] = [];
    const handler = async (request: Request) => {
      seen.push({ url: request.url, body: await request.text(), title: request.headers.get("title") });
      return new Response("OK");
    };
    return { seen, handler };
  };
  const dailyAlert = (h: Harness) => h.emails.find((e) => e.subject.includes("Daily check failed"));

  it("sends the test Lead from the site's own origin, so a wrong allow-list is caught", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler }, bindings: { ALLOWED_ORIGINS: "https://other.test" } });
    await w.cron(new Date(), DAILY_CRON);
    expect(dailyAlert(w)?.text).toContain("ALLOWED_ORIGINS");
  });

  it("alerts when the Turnstile secret is wrong", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler }, bindings: { TURNSTILE_SECRET_KEY: "wrong" } });
    await w.cron(new Date(), DAILY_CRON);
    expect(dailyAlert(w)?.text).toContain("Turnstile secret");
  });

  it("reports recent Leads whose alerts never went out", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler } });
    const { lead_id } = (await (await w.post(submission())).json()) as { lead_id: string };
    await w.eventually(async () => (await w.rows())[0]?.alert_status === "sent");
    await w.rows("UPDATE leads SET delivery_status = 'failed', failure_alert_status = 'failed', failure_alert_attempts = 5");
    await w.cron(new Date(), DAILY_CRON);
    expect(dailyAlert(w)?.text).toContain(lead_id);
  });

  it("reports a spike of Turnstile rejections", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler } });
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await w.rows(`INSERT INTO spam_counts (day, reason, count) VALUES ('${yesterday}', 'turnstile', 80)`);
    await w.cron(new Date(), DAILY_CRON);
    expect(dailyAlert(w)?.text).toContain("80 submissions failed Turnstile");
  });

  it("pings the heartbeat on success, and its fail URL otherwise", async () => {
    const hc = recorder();
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler, "hc.test": hc.handler }, bindings: { HEARTBEAT_URL: "https://hc.test/ping/abc" } });
    await w.cron(new Date(), DAILY_CRON);
    expect(hc.seen.map((s) => s.url)).toEqual(["https://hc.test/ping/abc"]);
    await w.dispose();

    const hc2 = recorder();
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo([500]).handler, "hc.test": hc2.handler }, bindings: { HEARTBEAT_URL: "https://hc.test/ping/abc" } });
    await w.cron(new Date(), DAILY_CRON);
    expect(hc2.seen.map((s) => s.url)).toEqual(["https://hc.test/ping/abc/fail"]);
    expect(hc2.seen[0].body).toBe("");
  });

  it("skips the test Lead on a Worker with no Brevo account (the preview)", async () => {
    w = await startWorker({ bindings: { BREVO_API_KEY: "" } });
    await w.cron(new Date(), DAILY_CRON);
    expect(await w.rows()).toEqual([]);
    expect(w.emails).toEqual([]);
  });
});

describe("the push channel", () => {
  it("pushes each alert's subject to ntfy, never the Lead's details", async () => {
    const seen: { body: string; title: string | null }[] = [];
    w = await startWorker({
      outbound: {
        "api.brevo.com": fakeBrevo().handler,
        "ntfy.test": async (request) => {
          seen.push({ body: await request.text(), title: request.headers.get("title") });
          return new Response("{}");
        },
      },
      bindings: { NTFY_URL: "https://ntfy.test/msp-alerts" },
    });
    await w.post(submission());
    await w.eventually(async () => seen.length === 1);
    expect(seen[0].title).toBe("New enquiry: consultation_request");
    expect(JSON.stringify(seen)).not.toContain("asha");
    expect(JSON.stringify(seen)).not.toContain("Asha");
  });
});
