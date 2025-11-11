-- Update freebie_subscribers table to rename welcome_email_sent to guide_access_email_sent
-- and ensure all necessary fields exist

-- Rename the email sent field to be more accurate
DO $$ 
BEGIN
  -- Check if the old column exists and rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freebie_subscribers' 
    AND column_name = 'welcome_email_sent'
  ) THEN
    ALTER TABLE freebie_subscribers 
    RENAME COLUMN welcome_email_sent TO guide_access_email_sent;
    
    ALTER TABLE freebie_subscribers 
    RENAME COLUMN welcome_email_sent_at TO guide_access_email_sent_at;
    
    RAISE NOTICE 'Renamed columns from welcome_email_* to guide_access_email_*';
  END IF;

  -- Check if the new column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freebie_subscribers' 
    AND column_name = 'guide_access_email_sent'
  ) THEN
    ALTER TABLE freebie_subscribers 
    ADD COLUMN guide_access_email_sent BOOLEAN DEFAULT FALSE;
    
    ALTER TABLE freebie_subscribers 
    ADD COLUMN guide_access_email_sent_at TIMESTAMP;
    
    RAISE NOTICE 'Added guide_access_email_* columns';
  END IF;
END $$;

-- Ensure email_tags column exists for database-level tagging
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freebie_subscribers' 
    AND column_name = 'email_tags'
  ) THEN
    ALTER TABLE freebie_subscribers 
    ADD COLUMN email_tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    
    RAISE NOTICE 'Added email_tags column';
  END IF;
END $$;

-- Ensure resend_contact_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freebie_subscribers' 
    AND column_name = 'resend_contact_id'
  ) THEN
    ALTER TABLE freebie_subscribers 
    ADD COLUMN resend_contact_id TEXT;
    
    RAISE NOTICE 'Added resend_contact_id column';
  END IF;
END $$;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_freebie_subscribers_email ON freebie_subscribers(email);

-- Add index on resend_contact_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_freebie_subscribers_resend_id ON freebie_subscribers(resend_contact_id);

-- Initialize email_tags for existing subscribers
UPDATE freebie_subscribers 
SET email_tags = ARRAY['freebie-subscriber', 'sselfie-guide']
WHERE email_tags IS NULL OR array_length(email_tags, 1) IS NULL;

SELECT 'Freebie subscribers table updated successfully!' as status;
