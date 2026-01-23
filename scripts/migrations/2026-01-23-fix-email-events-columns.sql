-- Migration: Ensure email_events columns + indexes
-- Purpose: Add missing columns for email_events tracking
-- Rollback: DROP INDEX IF EXISTS idx_email_events_campaign_key; ALTER TABLE email_events DROP COLUMN IF EXISTS campaign_key;

BEGIN;

ALTER TABLE email_events
  ADD COLUMN IF NOT EXISTS campaign_key TEXT,
  ADD COLUMN IF NOT EXISTS provider_broadcast_id TEXT,
  ADD COLUMN IF NOT EXISTS recipient_count INTEGER,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_email_events_campaign_key ON email_events(campaign_key);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('2026-01-23-fix-email-events-columns')
ON CONFLICT (version) DO NOTHING;

COMMIT;
