-- ⚠️ DEPRECATED: This schema was NEVER APPLIED to the database
-- 
-- The actual database uses SERIAL (INTEGER) for IDs and TEXT for user_id.
-- See scripts/00-create-all-tables.sql for the ACTUAL schema.
-- 
-- DO NOT USE THIS FILE - It uses UUID types that don't match the database.
-- This file is kept for reference only.

-- Maya AI Chat Tables

-- Maya chat sessions
CREATE TABLE IF NOT EXISTS maya_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maya chat messages
CREATE TABLE IF NOT EXISTS maya_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES maya_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maya personal memory for context and preferences
CREATE TABLE IF NOT EXISTS maya_personal_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'fact', 'goal', 'style')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, memory_type, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maya_chats_user_id ON maya_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_chat_id ON maya_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_maya_personal_memory_user_id ON maya_personal_memory(user_id);
