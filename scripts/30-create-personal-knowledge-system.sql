-- Personal Story and Writing Samples System
-- Allows agents to understand Sandra's personal narrative and write in her voice

-- Sandra's personal story and journey
CREATE TABLE IF NOT EXISTS admin_personal_story (
  id SERIAL PRIMARY KEY,
  story_type TEXT NOT NULL, -- 'origin', 'journey', 'daily_life', 'values', 'wins', 'struggles'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  timeframe TEXT, -- e.g., "2023-2024" or "Early days"
  emotional_tone TEXT, -- 'inspiring', 'vulnerable', 'celebratory', etc.
  key_themes TEXT[], -- ['entrepreneurship', 'motherhood', 'learning', etc.]
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sandra's actual writing samples for voice matching
CREATE TABLE IF NOT EXISTS admin_writing_samples (
  id SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'email', 'caption', 'newsletter', 'comment', 'dm'
  sample_text TEXT NOT NULL,
  context TEXT, -- When/why this was written
  tone TEXT, -- 'warm', 'professional', 'casual', 'excited', etc.
  performance_score NUMERIC(3,1), -- 1-10 rating of how well it performed
  engagement_metrics JSONB, -- {opens, clicks, responses, likes, etc.}
  key_phrases TEXT[], -- Sandra's signature phrases from this sample
  target_audience TEXT, -- 'new_users', 'beta_users', 'existing_customers', etc.
  was_successful BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false, -- Can be used as a template
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  indexed_at TIMESTAMP WITH TIME ZONE -- When added to vector search
);

-- Learning feedback loop - track what Sandra edits
CREATE TABLE IF NOT EXISTS admin_agent_feedback (
  id SERIAL PRIMARY KEY,
  agent_output TEXT NOT NULL, -- What AI generated
  sandra_edit TEXT NOT NULL, -- Sandra's edited version
  context TEXT, -- What was the request/task
  edit_type TEXT, -- 'tone_adjustment', 'structure_change', 'fact_correction', 'style_improvement'
  key_changes TEXT[], -- Main things Sandra changed
  learned_patterns JSONB, -- Patterns extracted from the edit
  applied_to_knowledge BOOLEAN DEFAULT false, -- Has this been added to knowledge base
  chat_id INTEGER REFERENCES maya_chats(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content automation rules
CREATE TABLE IF NOT EXISTS admin_automation_triggers (
  id SERIAL PRIMARY KEY,
  trigger_event TEXT NOT NULL, -- 'new_user_signup', 'friday_newsletter', 'low_engagement_alert', etc.
  trigger_condition JSONB, -- Specific conditions to check
  automated_action TEXT NOT NULL, -- 'draft_welcome_email', 'create_newsletter', 'send_alert', etc.
  action_template TEXT, -- Template for the automated content
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_story_type ON admin_personal_story(story_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_personal_story_active ON admin_personal_story(is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_writing_samples_type ON admin_writing_samples(content_type);
CREATE INDEX IF NOT EXISTS idx_writing_samples_successful ON admin_writing_samples(was_successful) WHERE was_successful = true;
CREATE INDEX IF NOT EXISTS idx_writing_samples_template ON admin_writing_samples(is_template) WHERE is_template = true;

CREATE INDEX IF NOT EXISTS idx_agent_feedback_applied ON admin_agent_feedback(applied_to_knowledge) WHERE applied_to_knowledge = false;
CREATE INDEX IF NOT EXISTS idx_agent_feedback_chat ON admin_agent_feedback(chat_id);

CREATE INDEX IF NOT EXISTS idx_automation_triggers_active ON admin_automation_triggers(is_active) WHERE is_active = true;

COMMENT ON TABLE admin_personal_story IS 'Sandra''s personal narrative - origin story, journey, values, struggles, and wins for agents to understand her personally';
COMMENT ON TABLE admin_writing_samples IS 'Sandra''s actual writing samples for AI to learn her voice and style patterns';
COMMENT ON TABLE admin_agent_feedback IS 'Learning loop - tracks Sandra''s edits to agent output to improve over time';
COMMENT ON TABLE admin_automation_triggers IS 'Automation rules that trigger agent actions based on events';
