-- Spam rejections are counted for reporting but never stored (ADR-0013).
CREATE TABLE spam_counts (
  day TEXT NOT NULL,
  reason TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, reason)
);
