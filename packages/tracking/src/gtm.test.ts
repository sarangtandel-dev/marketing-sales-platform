import { describe, expect, it } from "vitest";
import { openPage } from "../test/page.ts";

const withGtm = (opts: Parameters<typeof openPage>[0]) => openPage({ ...opts, config: { gtm: "GTM-TEST1" } });

const gtmScripts = (page: ReturnType<typeof openPage>) =>
  [...page.window.document.querySelectorAll("script[src]")].filter((s) => s.getAttribute("src")!.includes("gtm.js"));

describe("GTM in Consent Mode basic", () => {
  it("doesn't load GTM before consent", () => {
    const page = withGtm({ url: "https://site.test/" });
    expect(gtmScripts(page)).toHaveLength(0);
  });

  it("loads GTM once analytics consent is given, exactly once", () => {
    const page = withGtm({ url: "https://site.test/" });
    page.grant({ analytics_storage: "granted" });
    page.grant({ analytics_storage: "granted", ad_storage: "granted" });
    const scripts = gtmScripts(page);
    expect(scripts).toHaveLength(1);
    expect(scripts[0].getAttribute("src")).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-TEST1");
    expect(page.dataLayer()).toContainEqual(expect.objectContaining({ event: "gtm.js" }));
  });

  it("loads GTM straight away when consent was given on an earlier page", () => {
    const page = withGtm({ url: "https://site.test/", consent: { analytics_storage: "granted" } });
    expect(gtmScripts(page)).toHaveLength(1);
  });

  it("keeps GTM off when consent is refused", () => {
    const page = withGtm({ url: "https://site.test/", consent: { analytics_storage: "denied", ad_storage: "denied" } });
    expect(gtmScripts(page)).toHaveLength(0);
  });

  it("does nothing without a configured container", () => {
    const page = openPage({ url: "https://site.test/", consent: { analytics_storage: "granted" } });
    expect(gtmScripts(page)).toHaveLength(0);
  });
});

describe("withdrawing consent", () => {
  it("keeps stored attribution when a returning Visitor's consent arrives after the script", () => {
    const first = openPage({ url: "https://site.test/?utm_source=a", consent: { analytics_storage: "granted" } });
    const storage = Object.fromEntries(Object.entries(first.storage()).map(([k, v]) => [k, JSON.stringify(v)]));
    // No consent update before the script runs: the consent tool restores it a moment later.
    const later = openPage({ url: "https://site.test/about", storage });
    later.grant({ analytics_storage: "granted" });
    expect(later.storage()).toHaveProperty("msp_first_touch");
  });

  it("deletes stored attribution when analytics consent is withdrawn", () => {
    const page = openPage({ url: "https://site.test/?utm_source=a", consent: { analytics_storage: "granted" } });
    expect(Object.keys(page.storage())).not.toEqual([]);
    page.grant({ analytics_storage: "denied" });
    expect(page.storage()).toEqual({});
  });
});
