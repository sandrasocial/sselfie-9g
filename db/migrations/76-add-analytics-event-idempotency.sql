BEGIN;

ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_idempotency_key_unique
  ON analytics_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;
