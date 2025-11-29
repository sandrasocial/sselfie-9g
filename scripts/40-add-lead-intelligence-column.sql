-- Add lead_intelligence column to blueprint_subscribers table
-- This stores AI-generated classification data for each Blueprint subscriber

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS lead_intelligence jsonb;

-- Create index for faster queries on lead_intelligence
CREATE INDEX IF NOT EXISTS idx_blueprint_lead_intelligence 
ON blueprint_subscribers USING gin (lead_intelligence);
