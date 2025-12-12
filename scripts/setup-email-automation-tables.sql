-- Email Automation System Tables
-- Run this migration to set up complete email automation with conversion tracking

-- Create welcome_back_sequence table for tracking cold user emails
CREATE TABLE IF NOT EXISTS welcome_back_sequence (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  initial_campaign_id INTEGER REFERENCES admin_email_campaigns(id),
  day_0_sent_at TIMESTAMP WITH TIME ZONE,
  day_7_email_sent BOOLEAN DEFAULT FALSE,
  day_7_email_sent_at TIMESTAMP WITH TIME ZONE,
  day_7_campaign_id INTEGER,
  day_14_email_sent BOOLEAN DEFAULT FALSE,
  day_14_email_sent_at TIMESTAMP WITH TIME ZONE,
  day_14_campaign_id INTEGER,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_welcome_back_email ON welcome_back_sequence(user_email);
CREATE INDEX IF NOT EXISTS idx_welcome_back_converted ON welcome_back_sequence(converted);
CREATE INDEX IF NOT EXISTS idx_welcome_back_day7 ON welcome_back_sequence(day_7_email_sent, day_0_sent_at) WHERE day_7_email_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_welcome_back_day14 ON welcome_back_sequence(day_14_email_sent, day_0_sent_at) WHERE day_14_email_sent = FALSE;

-- Add conversion tracking columns to email_logs (if not exist)
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS campaign_id INTEGER,
ADD COLUMN IF NOT EXISTS opened BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for email_logs conversion tracking
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_converted ON email_logs(converted);
CREATE INDEX IF NOT EXISTS idx_email_logs_opened ON email_logs(opened);
CREATE INDEX IF NOT EXISTS idx_email_logs_clicked ON email_logs(clicked);

-- Create updated_at trigger for welcome_back_sequence
CREATE OR REPLACE FUNCTION update_welcome_back_sequence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER welcome_back_sequence_updated_at
BEFORE UPDATE ON welcome_back_sequence
FOR EACH ROW
EXECUTE FUNCTION update_welcome_back_sequence_updated_at();

-- Add comments for documentation
COMMENT ON TABLE welcome_back_sequence IS 'Tracks Welcome Back email sequence for cold users (Day 0, 7, 14)';
COMMENT ON COLUMN welcome_back_sequence.converted IS 'Set to true when user makes a purchase, stops email sequence';
COMMENT ON COLUMN email_logs.converted IS 'Set to true when user converts after receiving email';
