export type Env = {
  LEAD_LOG: D1Database;
  TURNSTILE_SECRET_KEY: string;
  // Comma-separated site origins allowed to post forms, e.g. "https://example.com,https://www.example.com".
  ALLOWED_ORIGINS: string;
};
