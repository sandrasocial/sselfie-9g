-- Create user_journey_messages table for personalized user journey automation
CREATE TABLE IF NOT EXISTS user_journey_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('new_user', 'engaged_user', 'falling_behind', 'inactive', 'at_risk_of_churn')),
  content_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_via TEXT CHECK (delivered_via IN ('email', 'dashboard', 'notification', null))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_journey_messages_user_id ON user_journey_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_messages_created_at ON user_journey_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_journey_messages_state ON user_journey_messages(state);

-- Create composite index for user + date queries
CREATE INDEX IF NOT EXISTS idx_user_journey_messages_user_date ON user_journey_messages(user_id, created_at DESC);

-- Removed RLS policies (not compatible with Neon/standard PostgreSQL)

COMMENT ON TABLE user_journey_messages IS 'Stores personalized journey messages and recommendations for each user based on their activity state';
COMMENT ON COLUMN user_journey_messages.state IS 'User categorization: new_user, engaged_user, falling_behind, inactive, at_risk_of_churn';
COMMENT ON COLUMN user_journey_messages.content_json IS 'JSON object containing: encouragement, recommendation, maya_prompt, task, email_sent';
COMMENT ON COLUMN user_journey_messages.delivered_via IS 'How the message was delivered: email, dashboard, notification, or null if not yet delivered';
