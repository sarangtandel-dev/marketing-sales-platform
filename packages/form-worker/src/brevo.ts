// Brevo delivery (ADR-0013 step 4), keyed by email.
//
// A new contact is created with the Lead's fields. If the email already has a contact, only
// the Lead's own details (LEAD_ID, FORM_ID, FORM_TYPE, LEAD_RECEIVED_AT, PAGE_URL) are
// updated: an unauthenticated form must never overwrite someone's name or company, or sign
// them up (audit security H2). Retrying is safe: a create that already happened becomes an
// update of the same contact.
//
// Email marketing opt-ins go only through Brevo's double opt-in (ADR-0021): Brevo emails a
// confirmation link, and the contact joins the marketing list only after clicking it.
//
// Mapping: each submitted field `x` becomes the attribute `X` (uppercased; `email` is the
// contact key). These attributes, and EMAIL_OPT_IN, EMAIL_OPT_IN_VERSION, EMAIL_OPT_IN_AT,
// EMAIL_OPT_IN_PAGE and EMAIL_OPT_IN_FORM, must exist in the Brevo account.

const CONTACTS = "https://api.brevo.com/v3/contacts";
// Well inside the delivery lease, so a hung call can't outlive its claim.
const TIMEOUT_MS = 10_000;

export type LeadForBrevo = {
  id: string;
  form_id: string;
  form_type: string;
  fields: Record<string, string>;
  page_url: string | null;
  created_at: string;
  opt_ins: { channel: string; wording_version: string; given_at: string; page_url: string | null; form_id: string }[];
};

export type DeliveryResult = { ok: boolean; retryable: boolean; detail: string };

export type BrevoConfig = { apiKey: string; marketingListId?: number; doiTemplateId?: number; doiRedirectUrl?: string };

const attributeName = (field: string) => field.toUpperCase().replace(/[^A-Z0-9]/g, "_");

// Attributes the Worker sets itself; a submitted field can never write them.
const isReserved = (name: string) =>
  ["LEAD_ID", "FORM_ID", "FORM_TYPE", "LEAD_RECEIVED_AT", "PAGE_URL"].includes(name) || name.startsWith("EMAIL_OPT_IN");

function leadAttributes(lead: LeadForBrevo): Record<string, string> {
  return {
    LEAD_ID: lead.id,
    FORM_ID: lead.form_id,
    FORM_TYPE: lead.form_type,
    LEAD_RECEIVED_AT: lead.created_at,
    ...(lead.page_url ? { PAGE_URL: lead.page_url } : {}),
  };
}

function contactCreate(lead: LeadForBrevo) {
  const { email, ...rest } = lead.fields;
  const attributes: Record<string, string> = {};
  for (const [name, value] of Object.entries(rest)) {
    if (!isReserved(attributeName(name))) attributes[attributeName(name)] = value;
  }
  return { email, attributes: { ...attributes, ...leadAttributes(lead) }, updateEnabled: false };
}

async function call(apiKey: string, method: string, url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    method,
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
}

const failure = async (step: string, res: Response): Promise<DeliveryResult> => {
  const body = (await res.text()).trim().slice(0, 300);
  // Rate limits and server errors may pass; any other 4xx needs a person to fix it.
  return { ok: false, retryable: res.status === 429 || res.status >= 500, detail: `${step} ${res.status} ${body}` };
};

export async function deliverLead(cfg: BrevoConfig, lead: LeadForBrevo): Promise<DeliveryResult> {
  const email = lead.fields.email;
  const notes: string[] = [];
  try {
    const created = await call(cfg.apiKey, "POST", CONTACTS, contactCreate(lead));
    if (created.ok) notes.push(`created ${created.status}`);
    else {
      const text = await created.clone().text();
      if (created.status !== 400 || !text.includes("duplicate_parameter")) return failure("create", created);
      const updated = await call(cfg.apiKey, "PUT", `${CONTACTS}/${encodeURIComponent(email)}`, {
        attributes: leadAttributes(lead),
      });
      if (!updated.ok) return failure("update", updated);
      notes.push(`updated existing ${updated.status}`);
    }

    const optIn = lead.opt_ins.find((o) => o.channel === "email");
    if (optIn) {
      if (!cfg.doiTemplateId || !cfg.doiRedirectUrl || !cfg.marketingListId) {
        notes.push("email opt-in kept in the Lead Log only: double opt-in not configured");
      } else {
        const doi = await call(cfg.apiKey, "POST", `${CONTACTS}/doubleOptinConfirmation`, {
          email,
          includeListIds: [cfg.marketingListId],
          templateId: cfg.doiTemplateId,
          redirectionUrl: cfg.doiRedirectUrl,
          attributes: {
            EMAIL_OPT_IN: true,
            EMAIL_OPT_IN_VERSION: optIn.wording_version,
            EMAIL_OPT_IN_AT: optIn.given_at,
            ...(optIn.page_url ? { EMAIL_OPT_IN_PAGE: optIn.page_url } : {}),
            EMAIL_OPT_IN_FORM: optIn.form_id,
          },
        });
        if (!doi.ok) return failure("double opt-in", doi);
        notes.push("double opt-in email requested");
      }
    }
  } catch (err) {
    return { ok: false, retryable: true, detail: `network: ${(err as Error).message}` };
  }
  return { ok: true, retryable: false, detail: notes.join("; ") };
}

// Removes a contact by email; used to clean up the daily test Lead.
export async function deleteContact(apiKey: string, email: string): Promise<DeliveryResult> {
  try {
    const res = await fetch(`${CONTACTS}/${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      method: "DELETE",
      headers: { "api-key": apiKey, accept: "application/json" },
    });
    return { ok: res.ok || res.status === 404, retryable: false, detail: `${res.status}` };
  } catch (err) {
    return { ok: false, retryable: true, detail: `network: ${(err as Error).message}` };
  }
}
