-- PHASE 7 — BLOCK 3: High-Intent Blueprint Experience
-- Add new columns to blueprint_subscribers table
ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS intent_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_signal_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS first_high_intent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS readiness_label TEXT;

-- Create blueprint_signals table
CREATE TABLE IF NOT EXISTS blueprint_signals (
  id SERIAL PRIMARY KEY,
  subscriber_id INTEGER NOT NULL REFERENCES blueprint_subscribers(id),
  signal_type TEXT NOT NULL,
  signal_value TEXT,
  weight INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blueprint_signals_subscriber ON blueprint_signals(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_signals_type ON blueprint_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_readiness ON blueprint_subscribers(readiness_label);
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_intent_score ON blueprint_subscribers(intent_score);
