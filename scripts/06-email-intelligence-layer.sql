-- PHASE 4 - EMAIL INTELLIGENCE LAYER
-- Creates email_events table and adds engagement_score column

-- Block 1: Email Events Logging Table
CREATE TABLE IF NOT EXISTS email_events (
    id SERIAL PRIMARY KEY,
    subscriber_id INTEGER REFERENCES blueprint_subscribers(id),
    email_type TEXT NOT NULL,               -- newsletter | workflow | sequence | upsell
    campaign_id INTEGER,                    -- null for workflows
    sequence_id INTEGER,                    -- null unless part of sequence
    step_id INTEGER,                        -- null unless part of sequence
    status TEXT NOT NULL,                   -- delivered | opened | clicked | bounced | unsubscribed
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_subscriber ON email_events(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(email_type);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created ON email_events(created_at DESC);

-- Block 5: Engagement Score Column
ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_engagement_score ON blueprint_subscribers(engagement_score DESC);

-- Grant permissions (optional, adjust as needed)
-- GRANT ALL ON email_events TO your_app_user;
-- GRANT ALL ON SEQUENCE email_events_id_seq TO your_app_user;
