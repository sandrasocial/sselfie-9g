-- PHASE 3 - Behavioral Scoring + Automated Nurture System
-- Adds behavioral scoring columns to blueprint_subscribers table

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS behavior_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nurture_stage TEXT DEFAULT 'cold', -- cold, warm, hot
ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_behavior_score ON blueprint_subscribers(behavior_score);
CREATE INDEX IF NOT EXISTS idx_nurture_stage ON blueprint_subscribers(nurture_stage);
CREATE INDEX IF NOT EXISTS idx_last_event_at ON blueprint_subscribers(last_event_at);

-- Comments for clarity
COMMENT ON COLUMN blueprint_subscribers.behavior_score IS 'Cumulative behavior score based on user actions';
COMMENT ON COLUMN blueprint_subscribers.nurture_stage IS 'Lead stage: cold, warm, or hot';
COMMENT ON COLUMN blueprint_subscribers.last_event_at IS 'Timestamp of last tracked event';
COMMENT ON COLUMN blueprint_subscribers.last_email_sent_at IS 'Timestamp of last nurture email sent';
