-- Create beta_settings table to track beta program configuration
CREATE TABLE IF NOT EXISTS beta_settings (
  id SERIAL PRIMARY KEY,
  total_spots INTEGER NOT NULL DEFAULT 100,
  beta_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial beta settings (14 days from now)
INSERT INTO beta_settings (total_spots, beta_end_date)
VALUES (100, NOW() + INTERVAL '14 days')
ON CONFLICT DO NOTHING;
