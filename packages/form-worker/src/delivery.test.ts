import { afterEach, describe, expect, it } from "vitest";
import { fakeBrevo, type Harness, startWorker, submission } from "../test/harness.ts";

let w: Harness;
afterEach(() => w.dispose());

type Row = {
  id: string;
  delivery_status: string;
  delivery_attempts: number;
  next_attempt_at: string | null;
  delivery_log: string;
  alert_status: string | null;
};
const lead = async (h: Harness) => (await h.rows())[0] as unknown as Row | undefined;
const settled = (h: Harness, status: string) =>
  h.eventually(async () => {
    const row = await lead(h);
    return row?.delivery_status === status && row.alert_status ? row : undefined;
  });
const minutes = (from: string | Date, m: number) => new Date(new Date(from).getTime() + m * 60_000);

describe("Brevo delivery", () => {
  it("delivers each new Lead to Brevo after the reply, keyed by email", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    const { lead_id } = (await (await w.post(submission())).json()) as { lead_id: string };

    const row = await settled(w, "delivered");
    expect(row.delivery_attempts).toBe(1);
    expect(brevo.calls).toHaveLength(1);
    const [{ apiKey, body }] = brevo.calls;
    expect(apiKey).toBe("brevo-test-key");
    expect(body.email).toBe("asha@example.test");
    expect(body.updateEnabled).toBe(true);
    expect(body.attributes).toMatchObject({
      LEAD_ID: lead_id,
      FORM_ID: "contact",
      FORM_TYPE: "consultation_request",
      NAME: "Asha",
      MESSAGE: "We need a website.",
      PAGE_URL: "https://example.test/contact/",
    });
    expect(body.attributes).not.toHaveProperty("EMAIL");
    expect(body).not.toHaveProperty("listIds");
  });

  it("retries a temporary failure on the schedule, then delivers", async () => {
    const brevo = fakeBrevo([503]);
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission());

    const failed = await settled(w, "retrying");
    expect(failed.delivery_attempts).toBe(1);
    expect(failed.next_attempt_at).not.toBeNull();

    // Before the backoff has passed, the cron leaves it alone.
    await w.cron(minutes(failed.next_attempt_at!, -0.5));
    expect(brevo.calls).toHaveLength(1);

    await w.cron(minutes(failed.next_attempt_at!, 0.1));
    const row = await lead(w);
    expect(row?.delivery_status).toBe("delivered");
    expect(row?.delivery_attempts).toBe(2);
    expect(JSON.parse(row!.delivery_log)).toHaveLength(2);
  });

  it("sends the same upsert on a retry, so Brevo never gets a duplicate", async () => {
    const brevo = fakeBrevo([504]);
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission());
    const failed = await settled(w, "retrying");
    await w.cron(minutes(failed.next_attempt_at!, 1));
    expect(brevo.calls).toHaveLength(2);
    expect(brevo.calls[1].body).toEqual(brevo.calls[0].body);
  });

  it("gives up after the last attempt and alerts the owner", async () => {
    const brevo = fakeBrevo([503, 503, 503, 503, 503, 503]);
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission());
    let row = await settled(w, "retrying");
    while (row.delivery_status === "retrying") {
      await w.cron(minutes(row.next_attempt_at!, 1));
      row = (await lead(w))!;
    }
    expect(row.delivery_status).toBe("failed");
    expect(row.delivery_attempts).toBe(6);
    expect(brevo.calls).toHaveLength(6);
    const failure = w.emails.find((e) => e.subject.includes("not delivered"));
    expect(failure?.text).toContain(row.id);
  });

  it("fails at once, with an alert, on an error a retry can't fix", async () => {
    const brevo = fakeBrevo([400]);
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission());
    const row = await settled(w, "failed");
    expect(row.delivery_attempts).toBe(1);
    await w.eventually(async () => w.emails.some((e) => e.subject.includes("not delivered")));
  });

  it("still alerts the owner when Brevo is unreachable", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": () => { throw new Error("network down"); } } });
    await w.post(submission());
    const row = await settled(w, "retrying");
    expect(row.alert_status).toBe("sent");
    expect(w.emails.some((e) => e.subject.startsWith("New enquiry"))).toBe(true);
  });

  it("skips Brevo for a Lead with no email address", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission({ fields: { name: "Ravi", phone: "+919800000000" } }));
    await settled(w, "skipped");
    expect(brevo.calls).toEqual([]);
  });

  it("picks up a Lead whose first attempt never ran", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission());
    await settled(w, "delivered");
    await w.rows("UPDATE leads SET delivery_status = 'pending', delivery_attempts = 0, next_attempt_at = NULL");
    await w.cron(minutes(new Date(), 10));
    expect((await lead(w))?.delivery_status).toBe("delivered");
    expect(brevo.calls).toHaveLength(2);
  });
});
