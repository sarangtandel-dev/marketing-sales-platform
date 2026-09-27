export type Env = {
  LEAD_LOG: D1Database;
  TURNSTILE_SECRET_KEY: string;
  // Comma-separated site origins allowed to post forms, e.g. "https://example.com,https://www.example.com".
  ALLOWED_ORIGINS: string;
  // send_email binding (Email Routing); ALERT_TO must be a verified destination address.
  OWNER_ALERT: SendEmail;
  ALERT_FROM: string;
  ALERT_TO: string;
  BREVO_API_KEY: string;
  // Brevo list that email Marketing Opt-ins join. Unset: opt-ins are recorded but no list is joined.
  BREVO_MARKETING_LIST_ID?: string;
  // Monitoring (ADR-0037): signs test Leads, and the address the daily test Lead uses.
  MONITOR_SECRET?: string;
  MONITOR_TEST_EMAIL?: string;
};
