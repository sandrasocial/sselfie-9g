-- Weekly journal entries for Sandra's updates and stories
CREATE TABLE IF NOT EXISTS weekly_journal (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Week information
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- Product updates
  features_built TEXT,
  features_built_enhanced TEXT, -- AI-enhanced version
  
  -- Personal stories
  personal_story TEXT,
  personal_story_enhanced TEXT, -- AI-enhanced version
  
  -- Categorized content
  struggles TEXT,
  struggles_enhanced TEXT,
  wins TEXT,
  wins_enhanced TEXT,
  fun_activities TEXT,
  fun_activities_enhanced TEXT,
  
  -- Goals and vision
  weekly_goals TEXT,
  monthly_goals TEXT,
  future_self_vision TEXT,
  future_self_vision_enhanced TEXT,
  
  -- Metadata
  is_enhanced BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_weekly_journal_user_date 
ON weekly_journal(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_journal_published 
ON weekly_journal(user_id, published) 
WHERE published = TRUE;

-- Daily quick captures (lightweight, frequent updates)
CREATE TABLE IF NOT EXISTS daily_captures (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journal_id INTEGER REFERENCES weekly_journal(id) ON DELETE CASCADE,
  
  capture_date DATE NOT NULL,
  
  -- Quick capture fields
  today_win TEXT,
  today_struggle TEXT,
  feature_progress TEXT,
  photo_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_captures_user_date 
ON daily_captures(user_id, capture_date DESC);

-- Verify tables created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('weekly_journal', 'daily_captures')
  AND table_schema = 'public';

