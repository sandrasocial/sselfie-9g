-- Create email_sends table for tracking sequence emails
CREATE TABLE IF NOT EXISTS email_sends (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES admin_email_campaigns(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  resend_message_id TEXT,
  UNIQUE(campaign_id, user_email)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_sends_email ON email_sends(user_email);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at DESC);

-- Add comment
COMMENT ON TABLE email_sends IS 'Tracks individual email sends for automation sequences';

