-- Phase 6 - APA Full Logic Database Updates

-- Part 1: Add APA support columns to blueprint_subscribers
ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS last_apa_action_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS last_apa_offer_type TEXT NULL,
ADD COLUMN IF NOT EXISTS apa_disabled BOOLEAN DEFAULT FALSE;

-- Part 2: Create APA activity audit table
CREATE TABLE IF NOT EXISTS apa_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id INTEGER NOT NULL REFERENCES blueprint_subscribers(id),
    offer_type TEXT NOT NULL,
    action VARCHAR(50) NOT NULL,
    prediction_score INT,
    prediction_window TEXT,
    prediction_confidence INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_apa_log_subscriber ON apa_activity_log(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_apa_log_offer ON apa_activity_log(offer_type);
CREATE INDEX IF NOT EXISTS idx_apa_log_created ON apa_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_apa_action ON blueprint_subscribers(last_apa_action_at) WHERE last_apa_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_apa_disabled ON blueprint_subscribers(apa_disabled) WHERE apa_disabled = false;
