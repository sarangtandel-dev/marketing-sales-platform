import { describe, expect, it } from "vitest";
import { ALL, openPage } from "../test/page.ts";

// Regression tests for the independent review of the M0 build (2026-09-27).
type Msp = { msp: { attribution(): Record<string, { click_ids?: unknown } | null> | null } };
const touch = (p: ReturnType<typeof openPage>, key: string) =>
  (p.storage()[key] as { value: Record<string, unknown> } | undefined)?.value;

describe("withdrawing advertising consent (review #8)", () => {
  it("strips stored click IDs and stops sending them", () => {
    const p = openPage({ url: "https://site.test/?gclid=g1&utm_source=ads", consent: ALL });
    expect(touch(p, "msp_first_touch")?.click_ids).toEqual({ gclid: "g1" });
    p.grant({ ad_storage: "denied" });
    expect(touch(p, "msp_first_touch")?.click_ids).toBeUndefined();
    expect(touch(p, "msp_last_touch")?.click_ids).toBeUndefined();
    expect(touch(p, "msp_first_touch")?.source).toBe("ads");
    const attribution = (p.window as unknown as Msp).msp.attribution();
    expect(attribution?.first_touch?.click_ids).toBeUndefined();
  });

  it("leaves click IDs out of attribution when advertising consent is missing", () => {
    // Stored while ads were granted on an earlier page; this page only has analytics consent.
    const first = openPage({ url: "https://site.test/?gclid=g1", consent: ALL });
    const storage = Object.fromEntries(Object.entries(first.storage()).map(([k, v]) => [k, JSON.stringify(v)]));
    const later = openPage({ url: "https://site.test/about", storage, consent: { analytics_storage: "granted" } });
    expect((later.window as unknown as Msp).msp.attribution()?.first_touch?.click_ids).toBeUndefined();
  });
});

describe("referrer (review #9)", () => {
  it("keeps the referring host, and only the host, in the touch", () => {
    const p = openPage({ url: "https://site.test/", referrer: "https://www.google.com/search?q=asha+email", consent: ALL });
    expect(touch(p, "msp_first_touch")).toMatchObject({ source: "google", medium: "organic", referrer: "www.google.com" });
    expect(JSON.stringify(p.storage())).not.toContain("asha");
  });
});

describe("GA4 page_location (review #10)", () => {
  const withGtm = (url: string, consent: Parameters<typeof openPage>[0]["consent"]) =>
    openPage({ url, consent, config: { gtm: "GTM-TEST1" } });
  const pageLocation = (p: ReturnType<typeof openPage>) =>
    (p.dataLayer().find((e) => e && typeof e === "object" && "page_location" in e) as { page_location?: string })
      ?.page_location;

  it("gives GTM a page URL with only UTMs and, with ad consent, click IDs", () => {
    const url = "https://site.test/offer?utm_source=news&email=asha%40example.test&gclid=g1&ref=abc#top";
    expect(pageLocation(withGtm(url, ALL))).toBe("https://site.test/offer?utm_source=news&gclid=g1");
    expect(pageLocation(withGtm(url, { analytics_storage: "granted" }))).toBe("https://site.test/offer?utm_source=news");
  });

  it("drops UTM values that look personal from the page URL", () => {
    const p = withGtm("https://site.test/?utm_source=news&utm_term=asha%40example.test", ALL);
    expect(pageLocation(p)).toBe("https://site.test/?utm_source=news");
  });

  it("sets page_location before GTM starts", () => {
    const p = withGtm("https://site.test/?utm_source=news", ALL);
    const items = p.dataLayer() as Record<string, unknown>[];
    const at = items.findIndex((e) => e && typeof e === "object" && "page_location" in e);
    const start = items.findIndex((e) => e && typeof e === "object" && e.event === "gtm.js");
    expect(at).toBeGreaterThanOrEqual(0);
    expect(at).toBeLessThan(start);
  });
});

describe("dates in UTM values (review #13)", () => {
  it.each(["spring_2026-03-01", "sale20260927", "q3-2026", "launch-2026.09.27"])("keeps %s", (value) => {
    const p = openPage({ url: `https://site.test/?utm_source=news&utm_campaign=${value}`, consent: ALL });
    expect(touch(p, "msp_first_touch")?.campaign).toBe(value);
  });

  it.each(["+919800000000", "+91 98000 00000", "(080) 4123 4567", "9800000000"])("still drops %s", (value) => {
    const p = openPage({ url: `https://site.test/?utm_source=news&utm_term=${encodeURIComponent(value)}`, consent: ALL });
    expect(touch(p, "msp_first_touch")).not.toHaveProperty("term");
  });
});

describe("GA4 page_referrer (audit M5)", () => {
  const referrerOf = (url: string, referrer?: string) =>
    (
      openPage({ url, referrer, consent: ALL, config: { gtm: "GTM-TEST1" } })
        .dataLayer()
        .find((e) => e && typeof e === "object" && "page_referrer" in e) as { page_referrer?: string } | undefined
    )?.page_referrer;

  it("redacts our own previous page like page_location", () => {
    expect(referrerOf("https://site.test/b", "https://site.test/a?email=asha%40example.test&utm_source=news")).toBe(
      "https://site.test/a?utm_source=news",
    );
  });

  it("keeps only another site's origin", () => {
    expect(referrerOf("https://site.test/", "https://mail.example/inbox?user=asha")).toBe("https://mail.example/");
  });

  it("is empty for a direct visit", () => {
    expect(referrerOf("https://site.test/")).toBe("");
  });
});
