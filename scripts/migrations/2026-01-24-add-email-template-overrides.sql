-- Migration: Add email template overrides for marketing sequences
-- Purpose: Allow admin-managed HTML/text/subject overrides per email_type
-- Rollback: DROP TABLE IF EXISTS email_template_overrides;

BEGIN;

CREATE TABLE IF NOT EXISTS email_template_overrides (
  id SERIAL PRIMARY KEY,
  email_type TEXT NOT NULL UNIQUE,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_template_overrides_email_type ON email_template_overrides(email_type);

ALTER TABLE IF EXISTS marketing_send_runs
  ADD COLUMN IF NOT EXISTS email_type TEXT;

ALTER TABLE IF EXISTS marketing_send_runs
  ADD COLUMN IF NOT EXISTS tag_key TEXT;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('2026-01-24-add-email-template-overrides')
ON CONFLICT (version) DO NOTHING;

COMMIT;
