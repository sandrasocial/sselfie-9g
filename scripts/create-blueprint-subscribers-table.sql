-- Create blueprint_subscribers table for email capture and brand blueprint tracking
CREATE TABLE IF NOT EXISTS blueprint_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) NOT NULL UNIQUE,
  source VARCHAR(100) DEFAULT 'brand-blueprint',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Form data from blueprint
  business VARCHAR(500),
  dream_client TEXT,
  struggle TEXT,
  selfie_skill_level VARCHAR(50),
  feed_style VARCHAR(50),
  post_frequency VARCHAR(50),
  blueprint_score INTEGER DEFAULT 0,
  form_data JSONB, -- Store all form responses
  
  -- Engagement tracking
  blueprint_completed BOOLEAN DEFAULT FALSE,
  blueprint_completed_at TIMESTAMP WITH TIME ZONE,
  pdf_downloaded BOOLEAN DEFAULT FALSE,
  pdf_downloaded_at TIMESTAMP WITH TIME ZONE,
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
  email_tags TEXT[] DEFAULT ARRAY['blueprint-subscriber', 'sselfie-brand-blueprint']::text[],
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_email ON blueprint_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_access_token ON blueprint_subscribers(access_token);
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_created_at ON blueprint_subscribers(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_blueprint_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprint_subscribers_updated_at
BEFORE UPDATE ON blueprint_subscribers
FOR EACH ROW
EXECUTE FUNCTION update_blueprint_subscribers_updated_at();
