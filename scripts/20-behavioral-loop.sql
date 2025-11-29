-- PHASE 7 - BLOCK 7: Behavioral Loop Reinforcement
-- Add behavior loop columns to blueprint_subscribers

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS behavior_loop_stage TEXT,
ADD COLUMN IF NOT EXISTS behavior_loop_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_behavior_loop_at TIMESTAMP WITH TIME ZONE;

-- Create behavior loop log table
CREATE TABLE IF NOT EXISTS behavior_loop_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id INTEGER NOT NULL REFERENCES blueprint_subscribers(id),
  action_type TEXT NOT NULL,
  action_payload JSONB,
  score_change INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_loop_log_subscriber_id
ON behavior_loop_log (subscriber_id);

CREATE INDEX IF NOT EXISTS idx_behavior_loop_log_created_at
ON behavior_loop_log (created_at DESC);

-- Backfill existing subscribers with default values
UPDATE blueprint_subscribers
SET 
  behavior_loop_stage = 'cold',
  behavior_loop_score = 0,
  last_behavior_loop_at = NOW()
WHERE behavior_loop_stage IS NULL;
