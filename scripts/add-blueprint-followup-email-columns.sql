-- Add email tracking columns for blueprint follow-up sequence
-- Run this migration to enable automated follow-up emails

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS day_3_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS day_3_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS day_7_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS day_7_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS day_14_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS day_14_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_day3_email ON blueprint_subscribers(day_3_email_sent, created_at) WHERE day_3_email_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_day7_email ON blueprint_subscribers(day_7_email_sent, created_at) WHERE day_7_email_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_day14_email ON blueprint_subscribers(day_14_email_sent, created_at) WHERE day_14_email_sent = FALSE;
