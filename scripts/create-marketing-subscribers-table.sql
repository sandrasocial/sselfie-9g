-- Create marketing_subscribers table for Resend Audience sync
-- This table stores all subscribers from Resend Audience API

CREATE TABLE IF NOT EXISTS marketing_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  resend_id VARCHAR(255),
  user_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_marketing_subscribers_email ON marketing_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_marketing_subscribers_user_id ON marketing_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_subscribers_resend_id ON marketing_subscribers(resend_id);

-- Add comment
COMMENT ON TABLE marketing_subscribers IS 'Subscribers synced from Resend Audience API for email sequence automation';

