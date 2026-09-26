import { afterEach, describe, expect, it } from "vitest";
import { fakeBrevo, type Harness, startWorker, submission } from "../test/harness.ts";
import { DAILY_CRON, DELIVERY_CRON } from "./schedules.ts";

// Regression tests for the independent review of the M0 build (2026-09-27).
let w: Harness;
afterEach(() => w.dispose());

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);
const row = async (h: Harness) => (await h.rows())[0];

describe("alert recovery (review #2)", () => {
  it("resends an owner alert that failed, on a later cron run", async () => {
    w = await startWorker({ mailerFails: true, outbound: { "api.brevo.com": fakeBrevo().handler } });
    await w.post(submission());
    await w.eventually(async () => (await row(w))?.alert_status === "failed");
    w.setMailerFails(false);
    await w.cron(minutesFromNow(5), DELIVERY_CRON);
    expect((await row(w))?.alert_status).toBe("sent");
    expect(w.emails.filter((e) => e.subject.startsWith("New enquiry"))).toHaveLength(1);
  });

  it("sends the alert for a Lead whose alert never ran", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler } });
    await w.post(submission());
    await w.eventually(async () => (await row(w))?.alert_status === "sent");
    await w.rows("UPDATE leads SET alert_status = NULL");
    w.emails.length = 0;
    await w.cron(minutesFromNow(5), DELIVERY_CRON);
    expect((await row(w))?.alert_status).toBe("sent");
    expect(w.emails).toHaveLength(1);
  });

  it("records the not-delivered alert and resends it if it failed", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo([400]).handler } });
    await w.post(submission());
    await w.eventually(async () => (await row(w))?.delivery_status === "failed");
    await w.eventually(async () => (await row(w))?.failure_alert_status === "sent");

    w.setMailerFails(true);
    await w.rows("UPDATE leads SET failure_alert_status = NULL");
    await w.cron(minutesFromNow(5), DELIVERY_CRON);
    expect((await row(w))?.failure_alert_status).toBe("failed");
    w.setMailerFails(false);
    await w.cron(minutesFromNow(10), DELIVERY_CRON);
    expect((await row(w))?.failure_alert_status).toBe("sent");
  });

  it("gives up resending an alert after 5 attempts", async () => {
    w = await startWorker({ mailerFails: true, outbound: { "api.brevo.com": fakeBrevo().handler } });
    await w.post(submission());
    await w.eventually(async () => (await row(w))?.alert_status === "failed");
    for (let i = 1; i <= 6; i++) await w.cron(minutesFromNow(i * 10), DELIVERY_CRON);
    expect((await row(w))?.alert_attempts).toBe(5);
  });
});

describe("page URLs (review #3)", () => {
  it("drops the query string and fragment before storing or sending", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission({ page_url: "https://example.test/contact/?gclid=g1&utm_term=a%40b.c#top" }));
    await w.eventually(async () => (await row(w))?.delivery_status === "delivered");
    expect((await row(w))?.page_url).toBe("https://example.test/contact/");
    expect(brevo.calls[0].body.attributes).toMatchObject({ PAGE_URL: "https://example.test/contact/" });
    expect(JSON.stringify(w.emails)).not.toContain("gclid");
  });
});

describe("Brevo attributes (review #5)", () => {
  it("never lets a submitted field overwrite a system or opt-in attribute", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    const res = await w.post(
      submission({ fields: { email: "a@example.test", lead_id: "forged", email_opt_in_version: "v9", form_type: "x" } }),
    );
    const { lead_id } = (await res.json()) as { lead_id: string };
    await w.eventually(async () => (await row(w))?.delivery_status === "delivered");
    const { attributes } = brevo.calls[0].body as { attributes: Record<string, unknown> };
    expect(attributes.LEAD_ID).toBe(lead_id);
    expect(attributes.FORM_TYPE).toBe("consultation_request");
    expect(attributes).not.toHaveProperty("EMAIL_OPT_IN_VERSION");
  });
});

describe("consent state (review #9)", () => {
  it("stores the Visitor's Consent state with the Lead", async () => {
    w = await startWorker();
    await w.post(submission({ consent: { analytics: true, ads: false } }));
    expect(JSON.parse((await row(w))?.consent as string)).toEqual({ analytics: true, ads: false });
  });

  it("rejects a malformed Consent state", async () => {
    w = await startWorker();
    expect((await w.post(submission({ consent: { analytics: "yes" } }))).status).toBe(400);
  });
});

describe("preview origins (review #1)", () => {
  it("allows any branch preview of a Pages project through a wildcard entry", async () => {
    w = await startWorker({ bindings: { ALLOWED_ORIGINS: "https://example.test,https://*.client-zero.pages.dev" } });
    expect((await w.post(submission(), { origin: "https://main.client-zero.pages.dev" })).status).toBe(200);
    expect((await w.post(submission(), { origin: "https://evil.pages.dev" })).status).toBe(403);
    expect((await w.post(submission(), { origin: "https://a.b.client-zero.pages.dev" })).status).toBe(403);
  });
});

describe("daily test Lead timing (review #12)", () => {
  it("passes even when the cron runs well after its scheduled time", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.cron(new Date(Date.now() - 30 * 60_000), DAILY_CRON);
    expect(w.emails).toEqual([]);
    expect(brevo.deleted).toEqual(["monitor@agency.test"]);
  });
});
