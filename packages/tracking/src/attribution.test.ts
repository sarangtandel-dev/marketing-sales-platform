import { describe, expect, it } from "vitest";
import { ALL, openPage, storageOf } from "../test/page.ts";

type Touch = {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  click_ids?: Record<string, string>;
  landing_page: string;
  at: string;
};
type Stored<T> = { value: T; expires: string };

const touches = (page: ReturnType<typeof openPage>) => {
  const s = page.storage() as Record<string, Stored<Touch> | undefined>;
  return { first: s.msp_first_touch?.value, last: s.msp_last_touch?.value };
};

describe("consent", () => {
  it("writes nothing to storage before consent", () => {
    const page = openPage({ url: "https://site.test/?utm_source=news&utm_medium=email&gclid=abc" });
    expect(page.storage()).toEqual({});
  });

  it("stores the landing page's touch once consent is given on that page", () => {
    const page = openPage({ url: "https://site.test/pricing?utm_source=news&utm_medium=email&utm_campaign=sept" });
    page.grant({ analytics_storage: "granted" });
    expect(touches(page).first).toMatchObject({
      source: "news",
      medium: "email",
      campaign: "sept",
      landing_page: "/pricing",
    });
    expect(touches(page).last).toEqual(touches(page).first);
  });

  it("keeps storing nothing when consent is refused", () => {
    const page = openPage({ url: "https://site.test/?utm_source=x", consent: { analytics_storage: "denied" } });
    expect(page.storage()).toEqual({});
  });

  it("keeps click IDs out of storage without advertising consent", () => {
    const page = openPage({ url: "https://site.test/?gclid=abc", consent: { analytics_storage: "granted" } });
    expect(touches(page).first?.click_ids).toBeUndefined();
  });
});

describe("last non-direct touch", () => {
  const firstVisit = () => openPage({ url: "https://site.test/?utm_source=ads&utm_medium=cpc", consent: ALL });

  it("updates last touch on a later UTM visit and keeps first touch", () => {
    const first = firstVisit();
    const later = openPage({
      url: "https://site.test/?utm_source=news&utm_medium=email",
      storage: storageOf(first),
      consent: ALL,
    });
    expect(touches(later).first).toMatchObject({ source: "ads", medium: "cpc" });
    expect(touches(later).last).toMatchObject({ source: "news", medium: "email" });
  });

  it("never lets a direct visit overwrite last touch", () => {
    const later = openPage({ url: "https://site.test/about", storage: storageOf(firstVisit()), consent: ALL });
    expect(touches(later).last).toMatchObject({ source: "ads", medium: "cpc" });
  });

  it("treats navigation within the site as direct", () => {
    const later = openPage({
      url: "https://site.test/about",
      referrer: "https://site.test/",
      storage: storageOf(firstVisit()),
      consent: ALL,
    });
    expect(touches(later).last).toMatchObject({ source: "ads", medium: "cpc" });
  });

  it("updates last touch on a click ID alone", () => {
    const later = openPage({ url: "https://site.test/?msclkid=m1", storage: storageOf(firstVisit()), consent: ALL });
    expect(touches(later).last).toMatchObject({ source: "bing", medium: "cpc", click_ids: { msclkid: "m1" } });
  });

  it("records a first, direct visit as (direct) / (none)", () => {
    const page = openPage({ url: "https://site.test/", consent: ALL });
    expect(touches(page).first).toMatchObject({ source: "(direct)", medium: "(none)" });
  });
});

describe("referrer classification", () => {
  it.each([
    ["https://www.google.com/", { source: "google", medium: "organic" }],
    ["https://www.bing.com/search?q=x", { source: "bing", medium: "organic" }],
    ["https://duckduckgo.com/", { source: "duckduckgo", medium: "organic" }],
    ["https://www.linkedin.com/feed/", { source: "linkedin", medium: "social" }],
    ["https://l.facebook.com/", { source: "facebook", medium: "social" }],
    ["https://t.co/abc", { source: "twitter", medium: "social" }],
    ["https://blog.partner.example/post", { source: "blog.partner.example", medium: "referral" }],
  ])("classifies %s", (referrer, expected) => {
    const page = openPage({ url: "https://site.test/", referrer, consent: ALL });
    expect(touches(page).last).toMatchObject(expected);
  });
});

describe("click IDs", () => {
  const ids = { gclid: "g1", gbraid: "gb1", wbraid: "wb1", msclkid: "m1", fbclid: "f1", ttclid: "t1", li_fat_id: "l1", twclid: "x1" };

  it("captures every click ID in the shared list into first and last touch", () => {
    const page = openPage({ url: `https://site.test/?${new URLSearchParams(ids)}`, consent: ALL });
    expect(touches(page).first?.click_ids).toEqual(ids);
    expect(touches(page).last?.click_ids).toEqual(ids);
  });

  it("keeps first touch's click IDs when a later visit brings new ones", () => {
    const first = openPage({ url: "https://site.test/?gclid=first", consent: ALL });
    const later = openPage({ url: "https://site.test/?fbclid=later", storage: storageOf(first), consent: ALL });
    expect(touches(later).first?.click_ids).toEqual({ gclid: "first" });
    expect(touches(later).last?.click_ids).toEqual({ fbclid: "later" });
  });
});

describe("expiry", () => {
  it("stores attribution for 90 days", () => {
    const page = openPage({ url: "https://site.test/?utm_source=a", consent: ALL });
    const stored = page.storage().msp_first_touch as Stored<Touch>;
    const days = (Date.parse(stored.expires) - Date.parse(stored.value.at)) / 86_400_000;
    expect(Math.round(days)).toBe(90);
  });

  it("replaces attribution that has expired", () => {
    const old = { value: { source: "old", medium: "cpc", landing_page: "/", at: "2020-01-01T00:00:00.000Z" }, expires: "2020-03-31T00:00:00.000Z" };
    const page = openPage({
      url: "https://site.test/?utm_source=new",
      storage: { msp_first_touch: JSON.stringify(old), msp_last_touch: JSON.stringify(old) },
      consent: ALL,
    });
    expect(touches(page).first?.source).toBe("new");
    expect(touches(page).last?.source).toBe("new");
  });
});

describe("personal data", () => {
  it("never stores the query string, or UTM values that look like an email or phone number", () => {
    const page = openPage({
      url: "https://site.test/offer?utm_source=news&utm_content=asha%40example.test&utm_term=%2B919800000000&email=asha%40example.test",
      consent: ALL,
    });
    const raw = JSON.stringify(page.storage());
    expect(raw).not.toContain("asha");
    expect(raw).not.toContain("9800000000");
    expect(touches(page).first).toMatchObject({ source: "news", landing_page: "/offer" });
    expect(touches(page).first).not.toHaveProperty("content");
  });

  it("marks a known contact with a flag and an expiry only", () => {
    const page = openPage({ url: "https://site.test/", consent: ALL });
    (page.window as unknown as { msp: { markKnownContact(): void } }).msp.markKnownContact();
    const flag = page.storage().msp_known_contact as Stored<boolean>;
    expect(flag.value).toBe(true);
    expect(Object.keys(flag).sort()).toEqual(["expires", "value"]);
  });

  it("doesn't mark a known contact without consent", () => {
    const page = openPage({ url: "https://site.test/" });
    (page.window as unknown as { msp: { markKnownContact(): void } }).msp.markKnownContact();
    expect(page.storage()).toEqual({});
  });
});

describe("attribution for the form", () => {
  type Msp = { msp: { attribution(): Record<string, unknown> | null } };

  it("hands the stored touches and the GA client ID to the form", () => {
    const page = openPage({
      url: "https://site.test/contact?utm_source=news&gclid=g1",
      referrer: "https://www.google.com/",
      cookie: "_ga=GA1.1.123456789.1700000000",
      consent: ALL,
    });
    const attribution = (page.window as unknown as Msp).msp.attribution();
    expect(attribution).toMatchObject({
      first_touch: { source: "news", click_ids: { gclid: "g1" } },
      last_touch: { source: "news" },
      ga_client_id: "123456789.1700000000",
    });
  });

  it("hands over nothing without consent", () => {
    const page = openPage({ url: "https://site.test/?utm_source=news", cookie: "_ga=GA1.1.1.2" });
    expect((page.window as unknown as Msp).msp.attribution()).toBeNull();
  });

  it("leaves the GA client ID out without analytics consent to read it", () => {
    const page = openPage({ url: "https://site.test/", cookie: "_ga=GA1.1.1.2", consent: { ad_storage: "granted" } });
    expect((page.window as unknown as Msp).msp.attribution()).toBeNull();
  });
});
