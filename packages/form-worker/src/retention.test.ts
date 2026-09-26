import { afterEach, describe, expect, it } from "vitest";
import { type Harness, startWorker, submission } from "../test/harness.ts";
import { DAILY_CRON as DAILY, DELIVERY_CRON } from "./schedules.ts";

let w: Harness;
afterEach(() => w.dispose());

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

describe("Lead Log retention", () => {
  it("deletes Leads older than 90 days and keeps newer ones", async () => {
    w = await startWorker();
    await w.post(submission());
    await w.post(submission());
    await w.eventually(async () => (await w.rows()).every((r) => r.alert_status));

    const now = new Date();
    const [old, recent] = await w.rows();
    await w.rows(`UPDATE leads SET created_at = '${daysAgo(now, 91)}' WHERE id = '${old.id}'`);
    await w.rows(`UPDATE leads SET created_at = '${daysAgo(now, 89)}' WHERE id = '${recent.id}'`);

    await w.cron(now, DAILY);
    expect((await w.rows()).map((r) => r.id)).toEqual([recent.id]);
  });

  it("purges only on the daily schedule, not on the delivery cron", async () => {
    w = await startWorker();
    await w.post(submission());
    await w.eventually(async () => (await w.rows())[0]?.alert_status);
    const now = new Date();
    await w.rows(`UPDATE leads SET created_at = '${daysAgo(now, 100)}'`);
    await w.cron(now, DELIVERY_CRON);
    expect(await w.rows()).toHaveLength(1);
  });
});

describe("spam count", () => {
  it("counts rejections per day and reason without storing their content", async () => {
    w = await startWorker();
    await w.post(submission({ honeypot: "x" }));
    await w.post(submission({ honeypot: "y" }));
    await w.post(submission({ turnstile_token: "bot" }));

    expect(await w.rows()).toEqual([]);
    const counts = await w.rows("SELECT day, reason, count FROM spam_counts ORDER BY reason");
    const today = new Date().toISOString().slice(0, 10);
    expect(counts).toEqual([
      { day: today, reason: "honeypot", count: 2 },
      { day: today, reason: "turnstile", count: 1 },
    ]);
    const columns = await w.rows("SELECT name FROM pragma_table_info('spam_counts')");
    expect(columns.map((c) => c.name).sort()).toEqual(["count", "day", "reason"]);
  });
});
