-- Create lead_magnet_activity table for tracking lead magnet delivery and conversion
CREATE TABLE IF NOT EXISTS lead_magnet_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  magnet_type TEXT NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_to_signup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_magnet_user_id ON lead_magnet_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_type ON lead_magnet_activity(magnet_type);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_delivered ON lead_magnet_activity(delivered_at);

COMMENT ON TABLE lead_magnet_activity IS 'Tracks lead magnet delivery, opens, clicks, and conversions for growth tracking';
