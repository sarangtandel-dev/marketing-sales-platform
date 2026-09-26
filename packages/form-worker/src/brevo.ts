// Brevo delivery (ADR-0013 step 4). A Lead becomes a contact upsert keyed by email, so a
// retry updates the same contact and can never create a duplicate (ADR-0036).
//
// Brevo mapping (M0): each submitted field `x` becomes the attribute `X` (uppercased;
// `email` is the contact key, not an attribute), plus LEAD_ID, FORM_ID, FORM_TYPE,
// PAGE_URL and LEAD_RECEIVED_AT. These attributes must exist in the Brevo account.

const CONTACTS = "https://api.brevo.com/v3/contacts";

export type LeadForBrevo = {
  id: string;
  form_id: string;
  form_type: string;
  fields: Record<string, string>;
  page_url: string | null;
  created_at: string;
};

export type DeliveryResult = { ok: boolean; retryable: boolean; detail: string };

const attributeName = (field: string) => field.toUpperCase().replace(/[^A-Z0-9]/g, "_");

export function contactUpsert(lead: LeadForBrevo) {
  const { email, ...rest } = lead.fields;
  const attributes: Record<string, string> = {
    LEAD_ID: lead.id,
    FORM_ID: lead.form_id,
    FORM_TYPE: lead.form_type,
    LEAD_RECEIVED_AT: lead.created_at,
  };
  if (lead.page_url) attributes.PAGE_URL = lead.page_url;
  for (const [name, value] of Object.entries(rest)) attributes[attributeName(name)] = value;
  return { email, attributes, updateEnabled: true };
}

export async function upsertContact(apiKey: string, lead: LeadForBrevo): Promise<DeliveryResult> {
  let res: Response;
  try {
    res = await fetch(CONTACTS, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(contactUpsert(lead)),
    });
  } catch (err) {
    return { ok: false, retryable: true, detail: `network: ${(err as Error).message}` };
  }
  if (res.ok) return { ok: true, retryable: false, detail: `${res.status}` };
  const body = (await res.text()).slice(0, 300);
  // Rate limits and server errors may pass; any other 4xx needs a person to fix it.
  const retryable = res.status === 429 || res.status >= 500;
  return { ok: false, retryable, detail: `${res.status} ${body}` };
}
