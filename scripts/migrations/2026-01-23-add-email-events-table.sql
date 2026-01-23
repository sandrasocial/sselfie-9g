-- Migration: Add email_events table for email observability
-- Purpose: Track broadcast + transactional send events
-- Rollback: DROP TABLE IF EXISTS email_events;

BEGIN;

CREATE TABLE IF NOT EXISTS email_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  campaign_key TEXT,
  provider_broadcast_id TEXT,
  recipient_count INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign_key ON email_events(campaign_key);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('2026-01-23-add-email-events-table')
ON CONFLICT (version) DO NOTHING;

COMMIT;
