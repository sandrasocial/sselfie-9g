-- Create subscription_events table for tracking subscription lifecycle events
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- payment_failed, renewal_upcoming, cancellation, downgrade, upgrade
  event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_time ON subscription_events(event_time);
CREATE INDEX IF NOT EXISTS idx_subscription_events_email_sent ON subscription_events(email_sent);

COMMENT ON TABLE subscription_events IS 'Tracks subscription lifecycle events for churn prevention and upgrade workflows';
