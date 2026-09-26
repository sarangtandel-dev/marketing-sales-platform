-- The Lead Log (ADR-0013): every raw submission, written before delivery to Brevo,
-- deleted after 90 days. The row follows ADR-0036's Lead record.
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  submission_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_type TEXT NOT NULL,
  cta_type TEXT,
  fields TEXT NOT NULL,
  opt_ins TEXT,
  consent TEXT,
  attribution TEXT,
  language TEXT,
  page_url TEXT,
  is_test INTEGER NOT NULL DEFAULT 0,
  alert_status TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  delivery_log TEXT NOT NULL DEFAULT '[]',
  next_attempt_at TEXT
);

CREATE INDEX leads_created_at ON leads (created_at);

CREATE INDEX leads_delivery ON leads (delivery_status, next_attempt_at);
