import { afterEach, describe, expect, it } from "vitest";
import { type Harness, startWorker, submission } from "../test/harness.ts";

let w: Harness;
afterEach(() => w.dispose());

// The alert's final status; undefined while it's still unsent or mid-send.
const alertStatus = async (h: Harness) => {
  const [row] = await h.rows();
  const status = row?.alert_status as string | null;
  return status && status !== "sending" ? status : undefined;
};

describe("owner alert", () => {
  it("emails the owner about every new Lead, with its details", async () => {
    w = await startWorker();
    const res = await w.post(submission({ fields: { name: "Asha", email: "asha@example.test", message: "Hi" } }));
    const { lead_id } = (await res.json()) as { lead_id: string };

    await w.eventually(async () => (await alertStatus(w)) === "sent");
    expect(w.emails).toHaveLength(1);
    const [email] = w.emails;
    expect(email.from).toBe("alerts@agency.test");
    expect(email.to).toBe("owner@agency.test");
    expect(email.subject).toContain("consultation_request");
    expect(email.text).toContain("name: Asha");
    expect(email.text).toContain("email: asha@example.test");
    expect(email.text).toContain(lead_id);
    expect(email.text).toContain("https://example.test/contact/");
  });

  it("records a failed alert without changing the Visitor's success", async () => {
    w = await startWorker({ mailerFails: true });
    const res = await w.post(submission());
    expect(res.status).toBe(200);
    expect(await w.eventually(() => alertStatus(w))).toBe("failed");
    expect(w.emails).toEqual([]);
  });

  it("doesn't alert twice when the same submission is sent again", async () => {
    w = await startWorker();
    const s = submission();
    await w.post(s);
    await w.eventually(async () => (await alertStatus(w)) === "sent");
    await w.post(s);
    await new Promise((r) => setTimeout(r, 300));
    expect(w.emails).toHaveLength(1);
  });

  it("sends nothing for rejected spam", async () => {
    w = await startWorker();
    await w.post(submission({ honeypot: "filled" }));
    await new Promise((r) => setTimeout(r, 300));
    expect(w.emails).toEqual([]);
  });
});
