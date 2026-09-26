// The body a site's form component posts to the Worker, checked before anything else runs.

export type Submission = {
  form_id: string;
  form_type: string;
  cta_type?: string;
  submission_token: string;
  fields: Record<string, string>;
  honeypot: string;
  turnstile_token: string;
  opt_ins: OptIn[];
  attribution?: Attribution;
  page_url?: string;
  language?: string;
};

// A Marketing Opt-in the Visitor ticked. M0 offers email only (ADR-0021).
export type OptIn = { channel: "email"; version: string };

// Sent by the tracking script only when the Visitor gave consent (ADR-0022).
export type Attribution = { first_touch: unknown; last_touch: unknown; ga_client_id: string | null };
const MAX_ATTRIBUTION_BYTES = 4096;

function parseAttribution(value: unknown): Attribution | null | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const { first_touch = null, last_touch = null, ga_client_id = null } = value as Record<string, unknown>;
  const isTouch = (t: unknown) => t === null || (typeof t === "object" && !Array.isArray(t));
  if (!isTouch(first_touch) || !isTouch(last_touch)) return null;
  if (ga_client_id !== null && !isString(ga_client_id, 100)) return null;
  const attribution = { first_touch, last_touch, ga_client_id: ga_client_id as string | null };
  return JSON.stringify(attribution).length <= MAX_ATTRIBUTION_BYTES ? attribution : null;
}

export const MAX_BODY_BYTES = 64 * 1024;
const MAX_FIELDS = 30;
const MAX_FIELD_LENGTH = 5000;

const isString = (v: unknown, max = 200): v is string => typeof v === "string" && v.length <= max;
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns the submission, or null if it's malformed.
export function parseSubmission(raw: string): Submission | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;

  const {
    form_id,
    form_type,
    cta_type,
    submission_token,
    fields,
    honeypot,
    turnstile_token,
    opt_ins = [],
    attribution: rawAttribution,
    page_url,
    language,
  } = data;
  if (!isString(form_id) || !form_id || !isString(form_type) || !form_type) return null;
  if (cta_type !== undefined && !isString(cta_type)) return null;
  if (!isString(submission_token) || !TOKEN.test(submission_token)) return null;
  if (!isString(honeypot ?? "", MAX_FIELD_LENGTH) || !isString(turnstile_token, 4096)) return null;
  if (page_url !== undefined && !isString(page_url, 2048)) return null;
  if (language !== undefined && !isString(language, 20)) return null;

  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) return null;
  const entries = Object.entries(fields);
  if (entries.length > MAX_FIELDS) return null;
  if (!entries.every(([k, v]) => isString(k, 100) && isString(v, MAX_FIELD_LENGTH))) return null;

  if (!Array.isArray(opt_ins) || opt_ins.length > 5) return null;
  const optIns: OptIn[] = [];
  for (const o of opt_ins as { channel?: unknown; version?: unknown }[]) {
    if (o?.channel !== "email" || !isString(o.version, 100) || !o.version) return null;
    if (!optIns.some((x) => x.channel === o.channel)) optIns.push({ channel: "email", version: o.version });
  }

  const attribution = parseAttribution(rawAttribution);
  if (attribution === null) return null;

  return {
    form_id,
    form_type,
    cta_type,
    submission_token,
    fields: fields as Record<string, string>,
    honeypot: (honeypot as string | undefined) ?? "",
    turnstile_token,
    opt_ins: optIns,
    attribution,
    page_url,
    language,
  };
}
