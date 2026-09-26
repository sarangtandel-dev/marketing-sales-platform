export type Env = {
  LEAD_LOG: D1Database;
  TURNSTILE_SECRET_KEY: string;
  // Comma-separated site origins allowed to post forms, e.g. "https://example.com,https://www.example.com".
  ALLOWED_ORIGINS: string;
  // send_email binding (Email Routing); ALERT_TO must be a verified destination address.
  OWNER_ALERT: {
    send(message: { from: string; to: string; subject: string; text: string }): Promise<{ messageId: string }>;
  };
  ALERT_FROM: string;
  ALERT_TO: string;
  BREVO_API_KEY: string;
};
