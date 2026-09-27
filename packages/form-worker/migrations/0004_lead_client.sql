-- Which Client a Lead belongs to (ADR-0036's Lead record), ahead of one Worker per Client (M1).
ALTER TABLE leads ADD COLUMN client TEXT;
