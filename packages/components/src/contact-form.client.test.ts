import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { wireContactForm } from "./contact-form.client.ts";

// The contact form's browser behaviour, driven through its real submit flow with the
// Worker, the tracking script and Turnstile faked.
function page(fetchImpl: (url: string, init: RequestInit) => Promise<Response>) {
  const dom = new JSDOM(
    `<!doctype html><body>
      <form method="post" action="https://forms.test/lead" data-msp-form data-form-id="contact"
            data-form-type="consultation_request" data-language="en" data-success="Thanks" data-error="Try again">
        <input id="name" name="name" value="Asha">
        <input id="email" name="email" value="asha@example.test">
        <input type="checkbox" name="opt_in_email" data-opt-in-channel="email" data-opt-in-version="email-abc123">
        <input name="website" value="">
        <div class="cf-turnstile"><input name="cf-turnstile-response" value="token"></div>
        <button type="submit">Send</button>
        <p data-form-status></p>
      </form></body>`,
    { url: "https://site.test/contact/?utm_source=news&gclid=g1#form" },
  );
  const window = dom.window;
  const events: [string, Record<string, unknown>][] = [];
  const msp = {
    event: (name: string, params: Record<string, unknown>) => events.push([name, params]),
    attribution: () => ({ first_touch: null, last_touch: null, ga_client_id: null }),
    markKnownContact: vi.fn(),
    consent: () => ({ analytics: true, ads: false }),
  };
  const turnstile = { reset: vi.fn(), remove: vi.fn() };
  const fetch = vi.fn(fetchImpl);
  Object.assign(window, { msp, turnstile, fetch });
  const form = window.document.querySelector("form")!;
  wireContactForm(form, window as never);
  const submit = async () => {
    form.dispatchEvent(new window.Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
  };
  const lastBody = () => JSON.parse(fetch.mock.calls.at(-1)![1].body as string);
  return { window, form, events, msp, turnstile, fetch, submit, lastBody };
}

const ok = () => Promise.resolve(Response.json({ ok: true, lead_id: "L1" }));
const unavailable = () => Promise.resolve(Response.json({ ok: false, error: "unavailable" }, { status: 503 }));
const offline = () => Promise.reject(new TypeError("network down"));

describe("contact form", () => {
  it("pushes generate_lead once, only after the Worker confirms success", async () => {
    const p = page(ok);
    await p.submit();
    await vi.waitFor(() => expect(p.form.textContent).toContain("Thanks"));
    expect(p.events.filter(([n]) => n === "generate_lead")).toEqual([
      ["generate_lead", { form_id: "contact", form_type: "consultation_request" }],
    ]);
    expect(p.msp.markKnownContact).toHaveBeenCalledOnce();
  });

  it.each([
    ["a 503", unavailable],
    ["a network error", offline],
  ])("pushes no generate_lead on %s, shows the error and keeps the token for the retry", async (_, failure) => {
    const p = page(failure);
    await p.submit();
    await vi.waitFor(() => expect(p.form.querySelector("[data-form-status]")!.textContent).toBe("Try again"));
    expect(p.events.some(([n]) => n === "generate_lead")).toBe(false);
    expect(p.turnstile.reset).toHaveBeenCalled();
    const firstToken = p.lastBody().submission_token;
    p.fetch.mockImplementation(ok);
    await p.submit();
    expect(p.lastBody().submission_token).toBe(firstToken);
  });

  it("announces success through the live region that was already on the page", async () => {
    const p = page(ok);
    const status = p.form.querySelector("[data-form-status]")!;
    await p.submit();
    await vi.waitFor(() => expect(status.textContent).toBe("Thanks"));
    // Screen readers only announce changes to a live region that existed before the change.
    expect(status.isConnected).toBe(true);
    expect(p.form.querySelector("input, button")).toBeNull();
  });

  it("pushes form_start once per page view", () => {
    const p = page(ok);
    const input = p.form.querySelector("#name")!;
    input.dispatchEvent(new p.window.FocusEvent("focusin", { bubbles: true }));
    p.form.querySelector("#email")!.dispatchEvent(new p.window.FocusEvent("focusin", { bubbles: true }));
    expect(p.events.filter(([n]) => n === "form_start")).toHaveLength(1);
  });

  it("sends the page URL without its query string or fragment, and the Consent state", async () => {
    const p = page(ok);
    await p.submit();
    const body = p.lastBody();
    expect(body.page_url).toBe("https://site.test/contact/");
    expect(body.consent).toEqual({ analytics: true, ads: false });
    expect(body.fields).toEqual({ name: "Asha", email: "asha@example.test" });
    expect(body.opt_ins).toEqual([]);
  });

  it("sends a ticked opt-in with its wording version", async () => {
    const p = page(ok);
    (p.form.querySelector("input[name=opt_in_email]") as HTMLInputElement).checked = true;
    await p.submit();
    expect(p.lastBody().opt_ins).toEqual([{ channel: "email", version: "email-abc123" }]);
  });
});
