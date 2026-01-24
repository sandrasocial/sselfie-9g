-- Migration: Add marketing send run + queue tables
-- Purpose: Batch marketing sends safely under Resend rate limits
-- Rollback: DROP TABLE IF EXISTS marketing_send_queue; DROP TABLE IF EXISTS marketing_send_runs;

BEGIN;

CREATE TABLE IF NOT EXISTS marketing_send_runs (
  id SERIAL PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  sequence_key TEXT NOT NULL,
  tag_key TEXT,
  segment_id TEXT,
  campaign_key TEXT,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  processed_recipients INTEGER NOT NULL DEFAULT 0,
  broadcast_id TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_send_runs_sequence_key ON marketing_send_runs(sequence_key);
CREATE INDEX IF NOT EXISTS idx_marketing_send_runs_status ON marketing_send_runs(status);
CREATE INDEX IF NOT EXISTS idx_marketing_send_runs_created_at ON marketing_send_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS marketing_send_queue (
  id SERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  segment_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_send_queue_run_email ON marketing_send_queue(run_id, email);
CREATE INDEX IF NOT EXISTS idx_marketing_send_queue_status ON marketing_send_queue(status);
CREATE INDEX IF NOT EXISTS idx_marketing_send_queue_run_id ON marketing_send_queue(run_id);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('2026-01-23-add-marketing-send-queue')
ON CONFLICT (version) DO NOTHING;

COMMIT;
