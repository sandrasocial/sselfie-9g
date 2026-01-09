-- Create feature flag for paid blueprint
-- Run this before enabling the paid blueprint checkout

-- Create admin_feature_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_feature_flags (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert paid_blueprint_enabled flag (disabled by default)
INSERT INTO admin_feature_flags (key, value, description)
VALUES (
  'paid_blueprint_enabled',
  FALSE,
  'Enable $47 Paid Brand Blueprint mini product (checkout + generation)'
)
ON CONFLICT (key) DO NOTHING;

-- To enable the feature, run:
-- UPDATE admin_feature_flags SET value = TRUE WHERE key = 'paid_blueprint_enabled';

-- To disable the feature, run:
-- UPDATE admin_feature_flags SET value = FALSE WHERE key = 'paid_blueprint_enabled';
