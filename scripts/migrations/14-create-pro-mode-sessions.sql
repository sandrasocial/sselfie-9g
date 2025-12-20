-- Pro Mode Sessions Table
-- Tracks Pro Mode sessions and generation statistics
-- Part of Maya Pro Mode cleanup and implementation

CREATE TABLE IF NOT EXISTS pro_mode_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id INTEGER REFERENCES maya_chats(id) ON DELETE SET NULL,
  library_snapshot JSONB,
  concepts_generated INTEGER DEFAULT 0,
  images_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_pro_mode_sessions_user_id ON pro_mode_sessions(user_id);

-- Index on chat_id for session lookups
CREATE INDEX IF NOT EXISTS idx_pro_mode_sessions_chat_id ON pro_mode_sessions(chat_id);

-- Add table comment
COMMENT ON TABLE pro_mode_sessions IS 'Tracks Pro Mode sessions, library snapshots, and generation statistics per session.';







