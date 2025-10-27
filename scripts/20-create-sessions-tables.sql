-- Create photo_sessions table for tracking generation projects
CREATE TABLE IF NOT EXISTS photo_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  session_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, paused
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  total_shots INTEGER DEFAULT 0,
  completed_shots INTEGER DEFAULT 0,
  category VARCHAR(100), -- e.g., 'Executive Portrait', 'Casual', 'Professional'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create session_shots table for tracking individual shots in a session
CREATE TABLE IF NOT EXISTS session_shots (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  shot_name VARCHAR(255) NOT NULL,
  shot_type VARCHAR(100), -- e.g., 'Close up headshot', 'Half body shot', 'Full scene'
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, skipped
  image_id INTEGER, -- Reference to generated_images or ai_images
  order_index INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_photo_sessions_user_id ON photo_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_status ON photo_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_shots_session_id ON session_shots(session_id);
CREATE INDEX IF NOT EXISTS idx_session_shots_status ON session_shots(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_photo_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_sessions_updated_at
BEFORE UPDATE ON photo_sessions
FOR EACH ROW
EXECUTE FUNCTION update_photo_sessions_updated_at();
