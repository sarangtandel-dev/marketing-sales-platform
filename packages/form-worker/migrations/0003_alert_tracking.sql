-- Alerts are claimed with a lease and retried by the cron, like Brevo delivery
-- (independent review, 2026-09-27): the new-lead alert and the not-delivered alert.
ALTER TABLE leads ADD COLUMN alert_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE leads ADD COLUMN alert_lease TEXT;

ALTER TABLE leads ADD COLUMN failure_alert_status TEXT;

ALTER TABLE leads ADD COLUMN failure_alert_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE leads ADD COLUMN failure_alert_lease TEXT;
