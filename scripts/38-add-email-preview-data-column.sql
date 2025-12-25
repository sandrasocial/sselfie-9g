-- Migration: Add email_preview_data column to admin_agent_messages
-- This column stores structured email preview data (HTML, subject, preview text) 
-- similar to how maya_chat_messages stores concept_cards

-- First, ensure admin_agent_chats table exists (if not already created)
CREATE TABLE IF NOT EXISTS admin_agent_chats (
  id SERIAL PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  chat_title TEXT,
  agent_mode TEXT CHECK (agent_mode IS NULL OR agent_mode IN ('instagram', 'email', 'content', 'analytics', 'competitor', 'research')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure admin_agent_messages table exists (if not already created)
CREATE TABLE IF NOT EXISTS admin_agent_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES admin_agent_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the email_preview_data column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'admin_agent_messages' 
    AND column_name = 'email_preview_data'
  ) THEN
    ALTER TABLE admin_agent_messages 
    ADD COLUMN email_preview_data JSONB;
    
    COMMENT ON COLUMN admin_agent_messages.email_preview_data IS 
    'Structured email preview data from compose_email tool: {html, subjectLine, preview, readyToSend}';
    
    RAISE NOTICE '✅ Added email_preview_data column to admin_agent_messages';
  ELSE
    RAISE NOTICE 'ℹ️ Column email_preview_data already exists in admin_agent_messages';
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_agent_chats_user_id ON admin_agent_chats(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_agent_chats_last_activity ON admin_agent_chats(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_admin_agent_messages_chat_id ON admin_agent_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_admin_agent_messages_created_at ON admin_agent_messages(created_at);

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_agent_messages'
AND column_name = 'email_preview_data';
