-- Add user_id column to email_logs table for PHASE B automation engine
-- Note: Foreign key constraint added separately to avoid issues with existing data
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);

-- Add timestamp column if it doesn't exist (some tables might have created_at instead)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN timestamp TIMESTAMP NOT NULL DEFAULT NOW();
  END IF;
END $$;

