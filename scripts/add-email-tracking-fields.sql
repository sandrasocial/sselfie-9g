-- Add tracking fields to marketing_email_log for analytics
-- Phase 7: Marketing Analytics & Optimization Engine

ALTER TABLE marketing_email_log
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS link_clicked TEXT;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_marketing_email_log_opened_at 
  ON marketing_email_log(opened_at) WHERE opened_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_email_log_clicked_at 
  ON marketing_email_log(clicked_at) WHERE clicked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_email_log_campaign_type 
  ON marketing_email_log(campaign_type);

-- Index for date range analytics
CREATE INDEX IF NOT EXISTS idx_marketing_email_log_sent_at 
  ON marketing_email_log(sent_at DESC);

COMMENT ON COLUMN marketing_email_log.opened_at IS 'Timestamp when email was opened';
COMMENT ON COLUMN marketing_email_log.clicked_at IS 'Timestamp when link was clicked';
COMMENT ON COLUMN marketing_email_log.user_agent IS 'Browser/device user agent string';
COMMENT ON COLUMN marketing_email_log.link_clicked IS 'URL of link that was clicked';
