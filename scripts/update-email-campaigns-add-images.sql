-- Add image support to email campaigns
ALTER TABLE admin_email_campaigns
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS test_email_sent_to TEXT,
ADD COLUMN IF NOT EXISTS test_email_sent_at TIMESTAMPTZ;

-- Update existing campaigns to have new approval status
UPDATE admin_email_campaigns SET approval_status = 'draft' WHERE approval_status IS NULL;

COMMENT ON COLUMN admin_email_campaigns.approval_status IS 'draft, pending_approval, approved, rejected';
