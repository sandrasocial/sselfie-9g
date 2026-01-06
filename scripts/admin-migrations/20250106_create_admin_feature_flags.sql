-- Admin Feature Flags Table
-- Stores feature flags for controlling system behavior (e.g., email sending)

CREATE TABLE IF NOT EXISTS admin_feature_flags (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_admin_feature_flags_key ON admin_feature_flags(key);

-- Insert default email control flags
INSERT INTO admin_feature_flags (key, value, description, updated_by)
VALUES 
  ('email_sending_enabled', 'false', 'Global kill switch for all email sending', 'system'),
  ('email_test_mode', 'false', 'Test mode: emails only send to whitelisted recipients', 'system')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE admin_feature_flags IS 'Feature flags for controlling system behavior';

