-- Migration: Add Resend audience backfill queue + segment registry
-- Purpose: Backfill Resend audience in safe batches and store history segment IDs
-- Rollback: DROP TABLE IF EXISTS resend_audience_backfill_queue; DROP TABLE IF EXISTS resend_segment_registry;

BEGIN;

CREATE TABLE IF NOT EXISTS resend_audience_backfill_queue (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resend_backfill_status ON resend_audience_backfill_queue(status);

CREATE TABLE IF NOT EXISTS resend_segment_registry (
  key TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'history',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('2026-01-25-add-resend-backfill-queue')
ON CONFLICT (version) DO NOTHING;

COMMIT;
