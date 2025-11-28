-- Marketing Email Queue & Log Tables
-- Stores scheduled marketing emails and tracks sent email events

-- Added marketing_email_log table creation
CREATE TABLE IF NOT EXISTS marketing_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  subject TEXT NOT NULL,
  campaign_type VARCHAR NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_marketing_email_log_user_id 
  ON marketing_email_log(user_id);

-- Index for campaign type analytics
CREATE INDEX IF NOT EXISTS idx_marketing_email_log_campaign_type 
  ON marketing_email_log(campaign_type);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_marketing_email_log_sent_at 
  ON marketing_email_log(sent_at DESC);

-- Marketing Email Queue Table
CREATE TABLE IF NOT EXISTS marketing_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient polling queries
CREATE INDEX IF NOT EXISTS idx_marketing_email_queue_status_scheduled 
  ON marketing_email_queue(status, scheduled_for);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_marketing_email_queue_user_id 
  ON marketing_email_queue(user_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_marketing_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_marketing_email_queue_updated_at
  BEFORE UPDATE ON marketing_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_email_queue_updated_at();
