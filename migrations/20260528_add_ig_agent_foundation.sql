-- Migration: add IG agent foundation
-- Created: 2026-05-28
-- Author: Codex

-- ROLLBACK:
-- DROP TABLE IF EXISTS ig_audience_insights;
-- DROP TABLE IF EXISTS ig_contact_memory;
-- DROP TABLE IF EXISTS ig_messages;
-- DROP TABLE IF EXISTS ig_conversations;
-- DROP TABLE IF EXISTS ig_contacts;
-- ALTER TABLE instagram_connections DROP COLUMN IF EXISTS page_id;
-- ALTER TABLE instagram_connections DROP COLUMN IF EXISTS page_name;
-- ALTER TABLE instagram_connections DROP COLUMN IF EXISTS page_access_token;
-- ALTER TABLE instagram_connections DROP COLUMN IF EXISTS messaging_status;
-- ALTER TABLE instagram_connections DROP COLUMN IF EXISTS last_messaging_test_at;
-- ALTER TABLE instagram_connections DROP COLUMN IF EXISTS messaging_test_error;

BEGIN;

ALTER TABLE instagram_connections
  ADD COLUMN IF NOT EXISTS page_id TEXT,
  ADD COLUMN IF NOT EXISTS page_name TEXT,
  ADD COLUMN IF NOT EXISTS page_access_token TEXT,
  ADD COLUMN IF NOT EXISTS messaging_status TEXT DEFAULT 'not_tested',
  ADD COLUMN IF NOT EXISTS last_messaging_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS messaging_test_error TEXT;

CREATE TABLE IF NOT EXISTS ig_contacts (
  id SERIAL PRIMARY KEY,
  ig_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  full_name TEXT,
  profile_pic_url TEXT,
  is_icelandic BOOLEAN DEFAULT FALSE,
  is_verified_friend BOOLEAN DEFAULT FALSE,
  follower_count INTEGER,
  bio_snippet TEXT,
  linked_neon_user_id TEXT REFERENCES users(id),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ig_conversations (
  id SERIAL PRIMARY KEY,
  ig_user_id TEXT NOT NULL REFERENCES ig_contacts(ig_user_id),
  ig_thread_id TEXT UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('dm', 'comment', 'story_reply', 'mention')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'auto_handled', 'flagged', 'sandra_replied', 'snoozed', 'closed')),
  flag_reason TEXT,
  agent_confidence NUMERIC(4,3),
  draft_response TEXT,
  draft_generated_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_seen_by_sandra TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ig_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES ig_conversations(id) ON DELETE CASCADE,
  ig_message_id TEXT UNIQUE,
  from_type TEXT NOT NULL CHECK (from_type IN ('contact', 'agent', 'sandra')),
  content TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_confidence NUMERIC(4,3),
  ai_intent TEXT,
  growth_tags TEXT[] DEFAULT '{}',
  send_status TEXT DEFAULT 'received' CHECK (send_status IN ('received', 'draft', 'sent', 'failed', 'blocked')),
  source_payload JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ig_contact_memory (
  id SERIAL PRIMARY KEY,
  ig_user_id TEXT NOT NULL REFERENCES ig_contacts(ig_user_id),
  memory_type TEXT NOT NULL CHECK (memory_type IN ('purchase', 'question', 'preference', 'flag', 'note', 'intent')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ig_audience_insights (
  id SERIAL PRIMARY KEY,
  week_of DATE NOT NULL,
  total_dms INTEGER DEFAULT 0,
  auto_handled INTEGER DEFAULT 0,
  flagged INTEGER DEFAULT 0,
  top_questions TEXT[],
  top_intents JSONB,
  sentiment_summary TEXT,
  content_signals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_contacts_ig_user_id ON ig_contacts (ig_user_id);
CREATE INDEX IF NOT EXISTS idx_ig_contacts_is_icelandic ON ig_contacts (is_icelandic) WHERE is_icelandic = TRUE;
CREATE INDEX IF NOT EXISTS idx_ig_contacts_tags ON ig_contacts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_ig_conversations_ig_user_id ON ig_conversations (ig_user_id);
CREATE INDEX IF NOT EXISTS idx_ig_conversations_status ON ig_conversations (status);
CREATE INDEX IF NOT EXISTS idx_ig_conversations_last_message_at ON ig_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ig_messages_conversation_id ON ig_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ig_messages_ig_message_id ON ig_messages (ig_message_id);
CREATE INDEX IF NOT EXISTS idx_ig_messages_growth_tags ON ig_messages USING GIN (growth_tags);

COMMIT;

