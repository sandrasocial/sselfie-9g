-- Create freebie_subscribers table for email capture and funnel tracking
CREATE TABLE IF NOT EXISTS freebie_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) NOT NULL UNIQUE,
  source VARCHAR(100) DEFAULT 'selfie-guide',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Engagement tracking
  guide_opened BOOLEAN DEFAULT FALSE,
  guide_opened_at TIMESTAMP WITH TIME ZONE,
  guide_completion_percentage INTEGER DEFAULT 0,
  cta_clicked BOOLEAN DEFAULT FALSE,
  cta_clicked_at TIMESTAMP WITH TIME ZONE,
  converted_to_user BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Email tracking
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  welcome_email_sent_at TIMESTAMP WITH TIME ZONE,
  resend_contact_id VARCHAR(255),
  
  -- Metadata
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  referrer TEXT,
  user_agent TEXT,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_freebie_subscribers_email ON freebie_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_freebie_subscribers_access_token ON freebie_subscribers(access_token);
CREATE INDEX IF NOT EXISTS idx_freebie_subscribers_created_at ON freebie_subscribers(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_freebie_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER freebie_subscribers_updated_at
BEFORE UPDATE ON freebie_subscribers
FOR EACH ROW
EXECUTE FUNCTION update_freebie_subscribers_updated_at();
