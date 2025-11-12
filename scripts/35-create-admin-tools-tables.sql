-- Tables for admin agent tools

-- Competitor analyses storage
CREATE TABLE IF NOT EXISTS admin_competitor_analyses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  strengths TEXT NOT NULL,
  weaknesses TEXT NOT NULL,
  content_strategy TEXT NOT NULL,
  differentiation_opportunities TEXT NOT NULL,
  key_insights TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_analyses_user ON admin_competitor_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analyses_created ON admin_competitor_analyses(created_at DESC);

-- Business insights storage
CREATE TABLE IF NOT EXISTS admin_business_insights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  insight_title TEXT NOT NULL,
  insight_category TEXT NOT NULL CHECK (insight_category IN ('content_opportunity', 'market_gap', 'trend_analysis', 'strategy_recommendation')),
  insight_description TEXT NOT NULL,
  action_items TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_insights_user ON admin_business_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_business_insights_priority ON admin_business_insights(priority, is_completed);
CREATE INDEX IF NOT EXISTS idx_business_insights_created ON admin_business_insights(created_at DESC);
