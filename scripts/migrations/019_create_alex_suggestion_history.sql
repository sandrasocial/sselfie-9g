-- Create table for tracking Alex's proactive suggestions
CREATE TABLE IF NOT EXISTS alex_suggestion_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  reasoning TEXT,
  priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  dismissed BOOLEAN DEFAULT false,
  acted_upon BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  dismissed_at TIMESTAMP,
  acted_upon_at TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_alex_suggestions_user_id ON alex_suggestion_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alex_suggestions_created_at ON alex_suggestion_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alex_suggestions_type ON alex_suggestion_history(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_alex_suggestions_dismissed ON alex_suggestion_history(dismissed) WHERE dismissed = false;

