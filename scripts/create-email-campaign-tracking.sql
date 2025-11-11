-- Create email campaign tracking tables

-- Track email clicks
CREATE TABLE IF NOT EXISTS email_campaign_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL,
  click_type VARCHAR(100) NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_clicks_tracking_id ON email_campaign_clicks(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_type ON email_campaign_clicks(click_type);

-- Add tags column to freebie_subscribers if it doesn't exist
ALTER TABLE freebie_subscribers 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_freebie_subscribers_tags ON freebie_subscribers USING GIN (tags);

-- Log
SELECT 'Email campaign tracking tables created successfully' AS status;
