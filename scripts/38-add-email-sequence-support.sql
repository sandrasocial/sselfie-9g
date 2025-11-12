-- Add email sequence support columns to admin_email_campaigns

ALTER TABLE admin_email_campaigns
ADD COLUMN IF NOT EXISTS sequence_position INTEGER,
ADD COLUMN IF NOT EXISTS sequence_total INTEGER,
ADD COLUMN IF NOT EXISTS send_delay_days INTEGER;

COMMENT ON COLUMN admin_email_campaigns.sequence_position IS 'Position of this email in a sequence (1, 2, 3, etc.)';
COMMENT ON COLUMN admin_email_campaigns.sequence_total IS 'Total number of emails in this sequence';
COMMENT ON COLUMN admin_email_campaigns.send_delay_days IS 'Number of days to wait before sending (for automated sequences)';

-- Create index for querying sequences
CREATE INDEX IF NOT EXISTS idx_admin_email_campaigns_sequence 
ON admin_email_campaigns(campaign_name, sequence_position);
