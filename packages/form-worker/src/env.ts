export type Env = {
  LEAD_LOG: D1Database;
  // Requests per IP per minute on /lead (Workers Rate Limiting binding).
  LEAD_RATE_LIMITER?: RateLimit;
  // The Client whose forms this Worker serves; recorded on every Lead.
  CLIENT_SLUG?: string;
  // "true" only on the preview Worker: Turnstile's test secret reports example.com for every token.
  TURNSTILE_SKIP_HOSTNAME?: string;
  TURNSTILE_SECRET_KEY: string;
  // Comma-separated site origins allowed to post forms, e.g. "https://example.com,https://www.example.com".
  ALLOWED_ORIGINS: string;
  // send_email binding (Email Routing); ALERT_TO must be a verified destination address.
  OWNER_ALERT: SendEmail;
  ALERT_FROM: string;
  ALERT_TO: string;
  // Unset or empty (the preview Worker): Leads are stored and alerted, and delivery is "skipped".
  BREVO_API_KEY?: string;
  // Brevo list that email Marketing Opt-ins join. Unset: opt-ins are recorded but no list is joined.
  BREVO_MARKETING_LIST_ID?: string;
  // Monitoring (ADR-0037): signs test Leads, and the address the daily test Lead uses.
  MONITOR_SECRET?: string;
  MONITOR_TEST_EMAIL?: string;
};
