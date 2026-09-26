// The contact form's browser behaviour (ADR-0013, ADR-0021, ADR-0022). Posts JSON to the
// form Worker. Success is shown, and generate_lead pushed, only when the Worker confirms
// the Lead Log write. A retry reuses the submission token, so the Worker maps it to the
// same lead ID instead of creating a second Lead.

type Turnstile = { reset: (el?: Element) => void; remove: (el?: Element) => void };
// The tracking script (@msp/tracking). Absent, or without consent, means no attribution.
type Msp = {
  attribution(): Record<string, unknown> | null;
  markKnownContact(): void;
  event(name: string, params: Record<string, unknown>): void;
  consent(): { analytics: boolean; ads: boolean };
};
type FormWindow = Window & { msp?: Msp; turnstile?: Turnstile };

const SKIPPED = (name: string) => name === "website" || name === "cf-turnstile-response" || name.startsWith("opt_in_");

export function wireContactForm(form: HTMLFormElement, win: FormWindow): void {
  let submissionToken = win.crypto.randomUUID();
  const status = form.querySelector<HTMLElement>("[data-form-status]")!;
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const identity = { form_id: form.dataset.formId, form_type: form.dataset.formType };

  // form_start: the first time the Visitor interacts with this form on this page.
  form.addEventListener("focusin", () => win.msp?.event("form_start", identity), { once: true });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new win.FormData(form);
    const fields: Record<string, string> = {};
    for (const [name, value] of data) {
      if (!SKIPPED(name) && typeof value === "string" && value !== "") fields[name] = value;
    }

    button.disabled = true;
    status.textContent = "";
    let ok = false;
    try {
      const res = await win.fetch(form.action, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          form_id: identity.form_id,
          form_type: identity.form_type,
          submission_token: submissionToken,
          fields,
          // Only ticked opt-ins are sent, each with the version of the wording shown.
          opt_ins: [...form.querySelectorAll<HTMLInputElement>("input[data-opt-in-channel]:checked")].map((box) => ({
            channel: box.dataset.optInChannel,
            version: box.dataset.optInVersion,
          })),
          attribution: win.msp?.attribution() ?? undefined,
          consent: win.msp?.consent(),
          honeypot: String(data.get("website") ?? ""),
          turnstile_token: String(data.get("cf-turnstile-response") ?? ""),
          // Never the query string or fragment: they can carry click IDs or personal data.
          page_url: win.location.origin + win.location.pathname,
          language: form.dataset.language,
        }),
      });
      ok = res.ok && (await res.json()).ok === true;
    } catch {
      ok = false;
    }

    const widget = form.querySelector(".cf-turnstile") ?? undefined;
    if (ok) {
      win.msp?.event("generate_lead", identity);
      win.msp?.markKnownContact();
      win.turnstile?.remove(widget);
      const done = win.document.createElement("p");
      done.className = "text-lg";
      done.textContent = form.dataset.success ?? "";
      form.replaceChildren(done);
      form.setAttribute("role", "status");
      submissionToken = win.crypto.randomUUID();
      return;
    }
    status.textContent = form.dataset.error ?? "";
    button.disabled = false;
    // Turnstile tokens are single-use, so each retry needs a fresh one.
    win.turnstile?.reset(widget);
  });
}
