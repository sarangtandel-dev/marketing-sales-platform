// The body a site's form component posts to the Worker, checked before anything else runs.

export type Submission = {
  form_id: string;
  form_type: string;
  cta_type?: string;
  submission_token: string;
  fields: Record<string, string>;
  honeypot: string;
  turnstile_token: string;
  page_url?: string;
  language?: string;
};

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

  const { form_id, form_type, cta_type, submission_token, fields, honeypot, turnstile_token, page_url, language } =
    data;
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

  return {
    form_id,
    form_type,
    cta_type,
    submission_token,
    fields: fields as Record<string, string>,
    honeypot: (honeypot as string | undefined) ?? "",
    turnstile_token,
    page_url,
    language,
  };
}
