-- Creating new tables that don't conflict with existing ones

-- Email campaign templates storage (for AI to save drafts)
CREATE TABLE IF NOT EXISTS admin_email_templates_ai (
  id SERIAL PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  body_text TEXT NOT NULL,
  body_html TEXT NOT NULL,
  target_audience JSONB,
  image_urls TEXT[],
  created_by TEXT DEFAULT 'maya_agent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor analyses storage
CREATE TABLE IF NOT EXISTS admin_competitor_analyses_ai (
  id SERIAL PRIMARY KEY,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  strengths TEXT NOT NULL,
  weaknesses TEXT NOT NULL,
  content_strategy TEXT NOT NULL,
  differentiation_opportunities TEXT NOT NULL,
  key_insights TEXT NOT NULL,
  created_by TEXT DEFAULT 'maya_agent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_analyses_ai_created ON admin_competitor_analyses_ai(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_ai_created ON admin_email_templates_ai(created_at DESC);
