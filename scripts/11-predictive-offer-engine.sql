-- Phase 4: Predictive Offer Timing Engine
-- Add prediction columns to blueprint_subscribers table

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS predicted_conversion_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS predicted_conversion_window TEXT,
ADD COLUMN IF NOT EXISTS predicted_offer_type TEXT,
ADD COLUMN IF NOT EXISTS last_prediction_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS prediction_confidence INTEGER DEFAULT 0;

-- Create conversion training signals table
CREATE TABLE IF NOT EXISTS conversion_training_signals (
    id SERIAL PRIMARY KEY,
    subscriber_id INTEGER NOT NULL REFERENCES blueprint_subscribers(id),
    signal_type TEXT NOT NULL,
    signal_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_signals_subscriber ON conversion_training_signals(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_bp_prediction_score ON blueprint_subscribers(predicted_conversion_score);
CREATE INDEX IF NOT EXISTS idx_bp_prediction_window ON blueprint_subscribers(predicted_conversion_window);
CREATE INDEX IF NOT EXISTS idx_bp_last_prediction ON blueprint_subscribers(last_prediction_at);
