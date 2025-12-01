-- Create abandoned_checkouts table for tracking incomplete checkout sessions
CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recovered BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_user_id ON abandoned_checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_email ON abandoned_checkouts(email);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_session_id ON abandoned_checkouts(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_created_at ON abandoned_checkouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_recovered ON abandoned_checkouts(recovered) WHERE recovered = FALSE;

