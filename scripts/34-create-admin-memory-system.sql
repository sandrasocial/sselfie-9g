-- Admin Memory & Insights System
-- Stores business-level insights, patterns, and automation tracking

CREATE TABLE IF NOT EXISTS admin_memory (
  id SERIAL PRIMARY KEY,
  memory_type TEXT NOT NULL, -- 'business_insight', 'content_pattern', 'user_behavior', 'strategy'
  category TEXT, -- 'instagram', 'email', 'competitor', 'general'
  title TEXT NOT NULL,
  insight TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Structured data for the insight
  confidence_score NUMERIC DEFAULT 0.5, -- 0-1, how confident we are in this insight
  impact_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  source TEXT, -- Where this insight came from
  related_user_ids TEXT[], -- Users this insight relates to
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_email_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- 'newsletter', 'promotional', 'welcome', 'announcement'
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  target_audience JSONB, -- Criteria for who receives this
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  total_recipients INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  metrics JSONB DEFAULT '{}',
  created_by TEXT DEFAULT 'ssa@ssasocial.com',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_automation_rules (
  id SERIAL PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'email_trigger', 'content_suggestion', 'user_notification'
  trigger_condition JSONB NOT NULL, -- What triggers this rule
  action JSONB NOT NULL, -- What action to take
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_content_performance (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'instagram_post', 'email', 'feed_layout'
  content_id INTEGER,
  content_title TEXT,
  content_category TEXT,
  performance_metrics JSONB NOT NULL, -- engagement, saves, shares, etc.
  success_score NUMERIC DEFAULT 0, -- 0-100
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  insights JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_business_insights (
  id SERIAL PRIMARY KEY,
  insight_type TEXT NOT NULL, -- 'trend', 'opportunity', 'risk', 'recommendation'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'new', -- 'new', 'reviewing', 'actioned', 'dismissed'
  actioned_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_memory_type ON admin_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_admin_memory_category ON admin_memory(category);
CREATE INDEX IF NOT EXISTS idx_admin_memory_active ON admin_memory(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_email_campaigns_status ON admin_email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_admin_email_campaigns_scheduled ON admin_email_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_admin_automation_rules_active ON admin_automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_content_performance_user ON admin_content_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_content_performance_type ON admin_content_performance(content_type);
CREATE INDEX IF NOT EXISTS idx_admin_business_insights_status ON admin_business_insights(status);
CREATE INDEX IF NOT EXISTS idx_admin_business_insights_priority ON admin_business_insights(priority);
