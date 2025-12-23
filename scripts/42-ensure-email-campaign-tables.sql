-- Ensure Email Campaign Tables Exist
-- This migration ensures all required tables and columns exist for the email marketing system
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Email campaigns table (should exist, but ensure all columns)
CREATE TABLE IF NOT EXISTS admin_email_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT,
  body_text TEXT,
  status TEXT DEFAULT 'draft',
  approval_status TEXT DEFAULT 'pending',
  target_audience JSONB,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_broadcast_id TEXT,
  total_recipients INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  metrics JSONB DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  test_email_sent_to TEXT,
  test_email_sent_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing table
ALTER TABLE admin_email_campaigns
  ADD COLUMN IF NOT EXISTS preview_text TEXT,
  ADD COLUMN IF NOT EXISTS body_html TEXT,
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS target_audience JSONB,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resend_broadcast_id TEXT,
  ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_opened INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_clicked INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_converted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS test_email_sent_to TEXT,
  ADD COLUMN IF NOT EXISTS test_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Update default approval_status for existing rows if null
UPDATE admin_email_campaigns 
SET approval_status = 'pending' 
WHERE approval_status IS NULL;

-- Email logs table (should exist, but ensure all columns)
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL,
  resend_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  campaign_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add campaign_id foreign key if it doesn't exist
DO $$
BEGIN
  -- Check if campaign_id column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'email_logs' 
    AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN campaign_id INTEGER;
  END IF;
  
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'email_logs_campaign_id_fkey'
  ) THEN
    ALTER TABLE email_logs 
    ADD CONSTRAINT email_logs_campaign_id_fkey 
    FOREIGN KEY (campaign_id) 
    REFERENCES admin_email_campaigns(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled 
ON admin_email_campaigns(scheduled_for) 
WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_email_logs_campaign 
ON email_logs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_email 
ON email_logs(user_email);

CREATE INDEX IF NOT EXISTS idx_email_logs_email_type 
ON email_logs(email_type);

CREATE INDEX IF NOT EXISTS idx_email_logs_status 
ON email_logs(status);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at 
ON email_logs(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_email_campaigns_status 
ON admin_email_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_admin_email_campaigns_scheduled 
ON admin_email_campaigns(scheduled_for);

-- Add comments for documentation
COMMENT ON TABLE admin_email_campaigns IS 'Stores email marketing campaigns created by admin agent';
COMMENT ON TABLE email_logs IS 'Tracks all email delivery attempts for monitoring and debugging';
COMMENT ON COLUMN admin_email_campaigns.approval_status IS 'draft, pending_approval, approved, rejected';
COMMENT ON COLUMN admin_email_campaigns.status IS 'draft, scheduled, sending, sent, failed';
COMMENT ON COLUMN email_logs.campaign_id IS 'Foreign key to admin_email_campaigns for tracking campaign performance';

