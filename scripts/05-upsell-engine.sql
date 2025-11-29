-- Phase 3 - Block 5: Upsell Engine Tables
-- Pure PostgreSQL compatible with Neon (no Supabase features)

-- A. Add upsell state tracking to blueprint_subscribers
ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS upsell_status TEXT DEFAULT 'none';

COMMENT ON COLUMN blueprint_subscribers.upsell_status IS 'Values: none, offered, clicked, purchased, rejected';

-- B. Create upsell history table
CREATE TABLE IF NOT EXISTS upsell_history (
  id SERIAL PRIMARY KEY,
  subscriber_id INTEGER NOT NULL,
  sequence_id INTEGER,
  event TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (subscriber_id) REFERENCES blueprint_subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_upsell_history_subscriber ON upsell_history(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_upsell_history_event ON upsell_history(event);
CREATE INDEX IF NOT EXISTS idx_upsell_history_created ON upsell_history(created_at DESC);

COMMENT ON TABLE upsell_history IS 'Tracks all upsell events for blueprint subscribers';

-- C. Create upsell triggers staging table
CREATE TABLE IF NOT EXISTS upsell_queue (
  id SERIAL PRIMARY KEY,
  subscriber_id INTEGER NOT NULL,
  intelligence JSONB,
  stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (subscriber_id) REFERENCES blueprint_subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_upsell_queue_subscriber ON upsell_queue(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_upsell_queue_approval ON upsell_queue(approved, processed);
CREATE INDEX IF NOT EXISTS idx_upsell_queue_created ON upsell_queue(created_at DESC);

COMMENT ON TABLE upsell_queue IS 'Admin approval queue for upsell sequences (admin-only flow)';
