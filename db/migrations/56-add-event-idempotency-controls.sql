-- Migration: 56-add-event-idempotency-controls
-- Created: 2026-05-08
-- Author: Codex

-- ROLLBACK (complete this before running in production):
-- BEGIN;
-- DROP INDEX IF EXISTS webhook_events_provider_event_id_idx;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS metadata;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS status;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS livemode;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS object_id;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS event_type;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS event_id;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS provider;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE webhook_events DROP COLUMN IF EXISTS first_seen_at;
-- COMMIT;

BEGIN;

CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id TEXT UNIQUE,
  processed_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS object_id TEXT,
  ADD COLUMN IF NOT EXISTS livemode BOOLEAN,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE webhook_events
SET
  provider = COALESCE(provider, 'stripe'),
  event_id = COALESCE(event_id, stripe_event_id),
  first_seen_at = COALESCE(first_seen_at, processed_at::timestamptz, NOW()),
  updated_at = COALESCE(updated_at, processed_at::timestamptz, NOW())
WHERE stripe_event_id IS NOT NULL
  AND (provider IS NULL OR event_id IS NULL);

ALTER TABLE webhook_events
  ALTER COLUMN provider SET DEFAULT 'stripe';

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_id_idx
  ON webhook_events (provider, event_id);

COMMIT;
