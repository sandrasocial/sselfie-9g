-- Create table to track launch campaign sends
CREATE TABLE IF NOT EXISTS launch_campaign_sends (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  campaign_name VARCHAR(100) NOT NULL DEFAULT 'launch-beta',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_id TEXT,
  status VARCHAR(50) DEFAULT 'sent',
  UNIQUE(email, campaign_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_launch_campaign_email ON launch_campaign_sends(email, campaign_name);
