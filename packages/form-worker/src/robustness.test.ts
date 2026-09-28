import { afterEach, describe, expect, it } from "vitest";
import { fakeBrevo, type Harness, startWorker, submission } from "../test/harness.ts";

// Leases and cron robustness (audit code B14): the first attempt and the cron never both
// deliver a Lead, one bad row never stops a batch, and a Lead that throws every time ends
// in "failed" with an alert instead of being retried forever.

let w: Harness;
afterEach(() => w.dispose());

type Row = { id: string; delivery_status: string; delivery_attempts: number; next_attempt_at: string | null; alert_status: string | null; alert_attempts: number };
const all = async (h: Harness) => (await h.rows()) as unknown as Row[];
const minutes = (from: string | Date, m: number) => new Date(new Date(from).getTime() + m * 60_000);
const bothRetrying = (h: Harness) =>
  h.eventually(async () => {
    const rows = await all(h);
    return rows.length === 2 && rows.every((r) => r.delivery_status === "retrying" && r.alert_status === "sent") ? rows : undefined;
  });

describe("delivery robustness", () => {
  it("delivers once when the cron runs while the first attempt is still in flight", async () => {
    const brevo = fakeBrevo();
    const slow = async (request: Request) => {
      await new Promise((r) => setTimeout(r, 300));
      return brevo.handler(request);
    };
    w = await startWorker({ outbound: { "api.brevo.com": slow } });
    await w.post(submission());
    await w.eventually(async () => (await all(w))[0]?.delivery_status === "sending");
    await w.cron(minutes(new Date(), 3));
    await w.eventually(async () => (await all(w))[0]?.delivery_status === "delivered");
    await new Promise((r) => setTimeout(r, 400));
    expect(brevo.calls).toHaveLength(1);
    expect((await all(w))[0].delivery_attempts).toBe(1);
  });

  it("keeps delivering the rest of a batch when one Lead throws", async () => {
    const brevo = fakeBrevo([503, 503]);
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission());
    await w.post(submission({ fields: { name: "Ravi", email: "ravi@example.test" } }));
    const [bad, good] = await bothRetrying(w);
    await w.rows(`UPDATE leads SET opt_ins = '{broken' WHERE id = '${bad.id}'`);

    const due = [bad, good].map((r) => new Date(r.next_attempt_at!).getTime());
    await w.cron(minutes(new Date(Math.max(...due)), 1));
    const after = Object.fromEntries((await all(w)).map((r) => [r.id, r]));
    expect(after[good.id].delivery_status).toBe("delivered");
    expect(after[bad.id].delivery_status).toBe("sending");
  });

  it("gives up on a Lead that throws on every attempt, and alerts the owner", async () => {
    const brevo = fakeBrevo([503]);
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission());
    let [row] = await w.eventually(async () => {
      const rows = await all(w);
      return rows[0]?.delivery_status === "retrying" && rows[0].alert_status === "sent" ? rows : undefined;
    });
    await w.rows("UPDATE leads SET opt_ins = '{broken'");

    for (let i = 0; i < 12 && row.delivery_status !== "failed"; i++) {
      await w.cron(minutes(row.next_attempt_at ?? new Date(), 1));
      [row] = await all(w);
    }
    expect(row.delivery_status).toBe("failed");
    expect(row.delivery_attempts).toBeLessThanOrEqual(7);
    expect(w.emails.filter((e) => e.subject.includes("not delivered"))).toHaveLength(1);
  });
});

describe("alert robustness", () => {
  it("stops retrying an alert that throws, after the last attempt", async () => {
    w = await startWorker({ outbound: { "api.brevo.com": fakeBrevo().handler } });
    await w.post(submission());
    await w.eventually(async () => (await all(w))[0]?.alert_status === "sent");
    await w.rows("UPDATE leads SET alert_status = NULL, alert_attempts = 0, fields = '{broken'");
    const sentBefore = w.emails.length;

    let at = minutes(new Date(), 10);
    for (let i = 0; i < 8; i++) {
      await w.cron(at);
      at = minutes(at, 6);
    }
    const [row] = await all(w);
    expect(row.alert_attempts).toBe(5);
    expect(row.alert_status).not.toBe("sent");
    expect(w.emails.length).toBe(sentBefore);
  });

  it("groups the cron's failure alerts into one digest", async () => {
    const brevo = fakeBrevo([503, 503, 400, 400]);
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission());
    await w.post(submission({ fields: { name: "Ravi", email: "ravi@example.test" } }));
    const rows = await bothRetrying(w);

    const due = rows.map((r) => new Date(r.next_attempt_at!).getTime());
    await w.cron(minutes(new Date(Math.max(...due)), 1));
    expect((await all(w)).every((r) => r.delivery_status === "failed")).toBe(true);
    const failures = w.emails.filter((e) => e.subject.includes("not delivered"));
    expect(failures).toHaveLength(1);
    expect(failures[0].subject).toContain("2 Leads");
    for (const r of rows) expect(failures[0].text).toContain(r.id);
  });
});
