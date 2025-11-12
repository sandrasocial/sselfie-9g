-- Isolated Admin Agent Chat System
-- Completely separate from user-facing Maya to prevent any data mixing or conflicts

CREATE TABLE IF NOT EXISTS admin_agent_chats (
  id SERIAL PRIMARY KEY,
  admin_user_id TEXT NOT NULL, -- Admin who started this chat
  agent_mode TEXT NOT NULL, -- 'email', 'content', 'research'
  chat_title TEXT DEFAULT 'New Chat',
  chat_summary TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT admin_agent_chats_mode_check CHECK (agent_mode IN ('email', 'content', 'research'))
);

CREATE TABLE IF NOT EXISTS admin_agent_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES admin_agent_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  
  -- Tool execution tracking
  tool_calls JSONB, -- Tools called by the agent
  tool_results JSONB, -- Results from tool execution
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT admin_agent_messages_role_check CHECK (role IN ('user', 'assistant'))
);

CREATE TABLE IF NOT EXISTS admin_agent_sessions (
  id SERIAL PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  total_chats INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  tools_used JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_agent_chats_user ON admin_agent_chats(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_agent_chats_mode ON admin_agent_chats(agent_mode);
CREATE INDEX IF NOT EXISTS idx_admin_agent_chats_activity ON admin_agent_chats(last_activity);
CREATE INDEX IF NOT EXISTS idx_admin_agent_messages_chat ON admin_agent_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_admin_agent_messages_created ON admin_agent_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_agent_sessions_user ON admin_agent_sessions(admin_user_id);

-- Comments for documentation
COMMENT ON TABLE admin_agent_chats IS 'Isolated chat storage for admin agents - completely separate from user-facing Maya system';
COMMENT ON TABLE admin_agent_messages IS 'Message history for admin agent conversations with tool execution tracking';
COMMENT ON TABLE admin_agent_sessions IS 'Session tracking for admin agent usage analytics';
