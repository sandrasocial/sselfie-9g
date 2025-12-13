-- Create table to track sent admin alert emails
-- This prevents spam by tracking when alerts were last sent
CREATE TABLE IF NOT EXISTS admin_alert_sent (
  id SERIAL PRIMARY KEY,
  alert_id VARCHAR(100) NOT NULL, -- e.g., "critical-bugs", "system-health", "beta-limit"
  alert_type VARCHAR(50) NOT NULL, -- "error", "warning"
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_data JSONB DEFAULT '{}', -- Store alert details for reference
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: We don't use a unique constraint here because we want to track
-- multiple sends over time. The application logic checks for recent sends
-- before sending new alerts.

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_alert_sent_alert_id ON admin_alert_sent(alert_id);
CREATE INDEX IF NOT EXISTS idx_admin_alert_sent_sent_at ON admin_alert_sent(sent_at DESC);

-- Add comment
COMMENT ON TABLE admin_alert_sent IS 'Tracks when admin alert emails were sent to prevent spam/duplicate notifications';
