import { afterEach, describe, expect, it } from "vitest";
import { type Harness, startWorker, submission } from "../test/harness.ts";

let w: Harness;
afterEach(() => w.dispose());

const touch = { source: "google", medium: "cpc", click_ids: { gclid: "g1" }, landing_page: "/", at: "2026-09-27T00:00:00.000Z" };

describe("attribution from the tracking script", () => {
  it("stores the first and last touch and the GA client ID in the Lead Log", async () => {
    w = await startWorker();
    const attribution = { first_touch: touch, last_touch: { ...touch, source: "news", medium: "email" }, ga_client_id: "1.2" };
    await w.post(submission({ attribution }));
    const [row] = await w.rows();
    expect(JSON.parse(row.attribution as string)).toEqual(attribution);
  });

  it("stores nothing when the Visitor gave no consent (no attribution sent)", async () => {
    w = await startWorker();
    await w.post(submission());
    const [row] = await w.rows();
    expect(row.attribution).toBeNull();
  });

  it("drops keys it doesn't know and rejects oversized or malformed attribution", async () => {
    w = await startWorker();
    await w.post(submission({ attribution: { first_touch: touch, last_touch: null, ga_client_id: null, email: "x@y.z" } }));
    const [row] = await w.rows();
    expect(JSON.parse(row.attribution as string)).toEqual({ first_touch: touch, last_touch: null, ga_client_id: null });

    for (const attribution of ["utm", [touch], { first_touch: { ...touch, source: "x".repeat(5000) } }]) {
      expect((await w.post(submission({ attribution }))).status).toBe(400);
    }
  });
});
