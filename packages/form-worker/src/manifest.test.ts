import { afterEach, describe, expect, it } from "vitest";
import { fakeBrevo, type Harness, startWorker, submission } from "../test/harness.ts";

// The Worker accepts only this Client's forms (audit security M2), and never overwrites an
// existing Brevo contact's details from an unauthenticated form (audit security H2).
let w: Harness;
afterEach(() => w.dispose());

const delivered = (h: Harness) =>
  h.eventually(async () => {
    const rows = await h.rows();
    return rows.length && rows.every((r) => r.delivery_status === "delivered") ? rows : undefined;
  });

describe("forms manifest", () => {
  it("rejects a form this Client's site doesn't have", async () => {
    w = await startWorker();
    expect((await w.post(submission({ form_id: "made-up" }))).status).toBe(400);
    expect(await w.rows()).toEqual([]);
  });

  it("rejects a form type that doesn't match the form", async () => {
    w = await startWorker();
    expect((await w.post(submission({ form_type: "newsletter" }))).status).toBe(400);
  });

  it("drops fields the form doesn't have, and keeps the Lead", async () => {
    w = await startWorker();
    await w.post(submission({ fields: { name: "Asha", email: "a@example.test", sms: "+10000", DEAL_STAGE: "won" } }));
    const [row] = await w.rows();
    expect(JSON.parse(row.fields as string)).toEqual({ name: "Asha", email: "a@example.test" });
  });

  it("drops an opt-in whose wording version the site never showed", async () => {
    w = await startWorker();
    await w.post(submission({ opt_ins: [{ channel: "email", version: "email-forged" }] }));
    const [row] = await w.rows();
    expect(JSON.parse(row.opt_ins as string)).toEqual([]);
  });
});

describe("existing Brevo contacts", () => {
  it("updates only the Lead's own details on a contact that already exists", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission({ fields: { name: "Asha", email: "asha@example.test", company: "Real Co" } }));
    await delivered(w);
    await w.post(submission({ fields: { name: "Mallory", email: "asha@example.test", company: "Fake Co" } }));
    await delivered(w);
    expect(brevo.updates).toHaveLength(1);
    const { attributes } = brevo.updates[0].body as { attributes: Record<string, unknown> };
    expect(Object.keys(attributes).sort()).toEqual(["FORM_ID", "FORM_TYPE", "LEAD_ID", "LEAD_RECEIVED_AT", "PAGE_URL"]);
    expect(JSON.stringify(brevo.updates)).not.toMatch(/Mallory|Fake Co/);
  });
});
