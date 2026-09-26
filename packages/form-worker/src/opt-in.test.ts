import { afterEach, describe, expect, it } from "vitest";
import { fakeBrevo, type Harness, startWorker, submission } from "../test/harness.ts";

let w: Harness;
afterEach(() => w.dispose());

const optIn = { channel: "email", version: "email-2026-09-27" };

const delivered = (h: Harness) =>
  h.eventually(async () => {
    const [row] = await h.rows();
    return row?.delivery_status === "delivered" ? row : undefined;
  });

describe("email marketing opt-in", () => {
  it("records a given opt-in in the Lead Log with its wording version, time, page and form", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({ outbound: { "api.brevo.com": brevo.handler } });
    await w.post(submission({ opt_ins: [optIn] }));
    const row = await delivered(w);
    const [record] = JSON.parse(row.opt_ins as string);
    expect(record).toEqual({
      channel: "email",
      wording_version: "email-2026-09-27",
      given_at: row.created_at,
      page_url: "https://example.test/contact/",
      form_id: "contact",
    });
  });

  it("sends the opt-in to Brevo and adds the contact to the marketing list", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({
      outbound: { "api.brevo.com": brevo.handler },
      bindings: { BREVO_MARKETING_LIST_ID: "7" },
    });
    await w.post(submission({ opt_ins: [optIn] }));
    const row = await delivered(w);
    const { body } = brevo.calls[0];
    expect(body.listIds).toEqual([7]);
    expect(body.attributes).toMatchObject({
      EMAIL_OPT_IN: true,
      EMAIL_OPT_IN_VERSION: "email-2026-09-27",
      EMAIL_OPT_IN_AT: row.created_at,
      EMAIL_OPT_IN_PAGE: "https://example.test/contact/",
      EMAIL_OPT_IN_FORM: "contact",
    });
  });

  it("records no opt-in and adds no list when the box isn't ticked", async () => {
    const brevo = fakeBrevo();
    w = await startWorker({
      outbound: { "api.brevo.com": brevo.handler },
      bindings: { BREVO_MARKETING_LIST_ID: "7" },
    });
    await w.post(submission());
    const row = await delivered(w);
    expect(JSON.parse(row.opt_ins as string)).toEqual([]);
    expect(brevo.calls[0].body).not.toHaveProperty("listIds");
    expect(brevo.calls[0].body.attributes).not.toHaveProperty("EMAIL_OPT_IN");
  });

  it("rejects opt-ins for channels M0 doesn't offer, or without a wording version", async () => {
    w = await startWorker();
    for (const opt_ins of [[{ channel: "sms", version: "v1" }], [{ channel: "email" }], "yes"]) {
      const res = await w.post(submission({ opt_ins }));
      expect(res.status).toBe(400);
    }
    expect(await w.rows()).toEqual([]);
  });
});
