import { describe, expect, it } from "vitest";
import { openPage } from "../test/page.ts";

type Msp = { msp: { event(name: string, params: Record<string, unknown>): void } };

const page = (body: string) =>
  openPage({ url: "https://site.test/", html: `<!doctype html><head></head><body>${body}</body>` });

const events = (p: ReturnType<typeof openPage>) =>
  p.dataLayer().filter((e): e is Record<string, unknown> => !!e && typeof e === "object" && "event" in e && !String((e as { event: string }).event).startsWith("gtm."));

describe("contact clicks", () => {
  it.each([
    ['<a id="x" href="tel:+919800000000">Call</a>', "call"],
    ['<a id="x" href="mailto:hello@site.test">Email</a>', "email"],
    ['<a id="x" href="sms:+919800000000">Text</a>', "sms"],
    ['<a id="x" href="https://wa.me/919800000000">WhatsApp</a>', "whatsapp"],
    ['<a id="x" href="https://api.whatsapp.com/send?phone=91980">WhatsApp</a>', "whatsapp"],
  ])("%s pushes one contact_click with channel %s", (html, channel) => {
    const p = page(html);
    p.click("#x");
    expect(events(p)).toEqual([{ event: "contact_click", channel }]);
  });

  it("adds the CTA Type when the contact link is a CTA, still as one event", () => {
    const p = page('<a id="x" href="tel:+91980" data-cta-id="call-us" data-cta-type="call">Call</a>');
    p.click("#x");
    expect(events(p)).toEqual([{ event: "contact_click", channel: "call", cta_type: "call", cta_id: "call-us" }]);
  });

  it("never puts the phone number or address in the event", () => {
    const p = page('<a id="x" href="tel:+919800000000">Call</a><a id="y" href="mailto:hello@site.test">Mail</a>');
    p.click("#x");
    p.click("#y");
    expect(JSON.stringify(p.dataLayer())).not.toMatch(/9800000000|hello@site/);
  });

  it("counts a click on an element inside the link", () => {
    const p = page('<a href="tel:+91980"><span id="x">Call</span></a>');
    p.click("#x");
    expect(events(p)).toEqual([{ event: "contact_click", channel: "call" }]);
  });
});

describe("CTA clicks", () => {
  it("pushes cta_click with the CTA Type from the site definition", () => {
    const p = page('<a id="x" href="/contact/" data-cta-id="consult" data-cta-type="consultation_request">Book</a>');
    p.click("#x");
    expect(events(p)).toEqual([{ event: "cta_click", cta_type: "consultation_request", cta_id: "consult" }]);
  });

  it("pushes nothing for an ordinary link", () => {
    const p = page('<a id="x" href="/about/">About</a>');
    p.click("#x");
    expect(events(p)).toEqual([]);
  });
});

describe("msp.event", () => {
  it("pushes allowed events with only their allowed parameters", () => {
    const p = page("");
    const { msp } = p.window as unknown as Msp;
    msp.event("generate_lead", { form_id: "contact", form_type: "consultation_request", email: "a@b.c", name: "Asha" });
    msp.event("form_start", { form_id: "contact", form_type: "consultation_request" });
    expect(events(p)).toEqual([
      { event: "generate_lead", form_id: "contact", form_type: "consultation_request" },
      { event: "form_start", form_id: "contact", form_type: "consultation_request" },
    ]);
  });

  it("ignores events that aren't in the event list", () => {
    const p = page("");
    (p.window as unknown as Msp).msp.event("contact_details", { email: "a@b.c" });
    expect(events(p)).toEqual([]);
  });
});
