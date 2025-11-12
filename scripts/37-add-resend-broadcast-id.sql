-- Add resend_broadcast_id column to admin_email_campaigns table
ALTER TABLE admin_email_campaigns 
ADD COLUMN IF NOT EXISTS resend_broadcast_id TEXT;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_campaigns_resend_broadcast_id 
ON admin_email_campaigns(resend_broadcast_id);

-- Add comment
COMMENT ON COLUMN admin_email_campaigns.resend_broadcast_id IS 'Resend broadcast ID for tracking broadcasts in Resend dashboard';
