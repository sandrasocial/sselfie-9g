-- Add enhanced brand story and performance tracking fields

-- Add best performing content tracking to user_personal_brand
ALTER TABLE user_personal_brand
ADD COLUMN IF NOT EXISTS best_performing_content JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS brand_story_extended TEXT,
ADD COLUMN IF NOT EXISTS origin_story TEXT,
ADD COLUMN IF NOT EXISTS mission_statement TEXT,
ADD COLUMN IF NOT EXISTS core_values JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS success_stories JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS testimonials JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS content_performance_notes TEXT;

-- Create content performance history table
CREATE TABLE IF NOT EXISTS content_performance_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'instagram_post', 'email', 'feed_layout', 'story'
  content_id INTEGER,
  content_title TEXT,
  content_description TEXT,
  performance_metrics JSONB NOT NULL, -- likes, comments, shares, saves, clicks, opens, etc.
  engagement_rate NUMERIC,
  success_score NUMERIC DEFAULT 0, -- 0-100
  audience_feedback JSONB DEFAULT '{}',
  what_worked TEXT,
  what_didnt_work TEXT,
  lessons_learned TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user milestones table
CREATE TABLE IF NOT EXISTS user_milestones (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL, -- 'follower_count', 'revenue', 'engagement', 'content_created'
  milestone_title TEXT NOT NULL,
  milestone_description TEXT,
  achieved_value NUMERIC,
  target_value NUMERIC,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  celebration_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create brand evolution tracking
CREATE TABLE IF NOT EXISTS brand_evolution (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  evolution_type TEXT NOT NULL, -- 'voice_change', 'visual_update', 'strategy_shift', 'audience_pivot'
  previous_state JSONB,
  new_state JSONB,
  reason_for_change TEXT,
  impact_observed TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_performance_history_user ON content_performance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_performance_history_type ON content_performance_history(content_type);
CREATE INDEX IF NOT EXISTS idx_content_performance_history_score ON content_performance_history(success_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_milestones_user ON user_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_user_milestones_type ON user_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_brand_evolution_user ON brand_evolution(user_id);
