-- Brand Engine Tables Migration
-- Created: 2026-01-29
-- Description: Creates tables for SSELFIE Brand Engine to persist engine runs, signals, performance data, and experiments

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Brand Engine Runs
-- Stores each execution of the brand engine (weekly, daily, on-demand)
CREATE TABLE IF NOT EXISTS brand_engine_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('weekly', 'daily', 'on_demand')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'running', 'completed', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outputs JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'modified')),
  approval_notes TEXT,
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for brand_engine_runs
CREATE INDEX IF NOT EXISTS idx_brand_engine_runs_user_id ON brand_engine_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_engine_runs_type ON brand_engine_runs(type);
CREATE INDEX IF NOT EXISTS idx_brand_engine_runs_status ON brand_engine_runs(status);
CREATE INDEX IF NOT EXISTS idx_brand_engine_runs_scheduled_for ON brand_engine_runs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_brand_engine_runs_created_at ON brand_engine_runs(created_at DESC);

-- Signals (Trends, Competitors, Culture Moments)
-- Stores external signals that inform content decisions
CREATE TABLE IF NOT EXISTS brand_engine_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('trend', 'competitor', 'culture')),
  source VARCHAR(50),
  title VARCHAR(255),
  description TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),
  velocity VARCHAR(20) CHECK (velocity IN ('rising', 'peaking', 'declining', 'stable')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for brand_engine_signals
CREATE INDEX IF NOT EXISTS idx_brand_engine_signals_user_id ON brand_engine_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_engine_signals_type ON brand_engine_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_brand_engine_signals_active ON brand_engine_signals(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_engine_signals_detected_at ON brand_engine_signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_engine_signals_expires_at ON brand_engine_signals(expires_at);

-- Performance Data
-- Stores post performance metrics and analysis
CREATE TABLE IF NOT EXISTS brand_engine_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  post_id VARCHAR(100),
  platform VARCHAR(20) CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'email', 'linkedin')),
  content_pillar VARCHAR(100),
  content_type VARCHAR(50),
  posted_at TIMESTAMPTZ,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance VARCHAR(20) CHECK (performance IN ('winner', 'average', 'loser')),
  why_it_worked TEXT,
  why_it_didnt TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for brand_engine_performance
CREATE INDEX IF NOT EXISTS idx_brand_engine_performance_user_id ON brand_engine_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_engine_performance_platform ON brand_engine_performance(platform);
CREATE INDEX IF NOT EXISTS idx_brand_engine_performance_pillar ON brand_engine_performance(content_pillar);
CREATE INDEX IF NOT EXISTS idx_brand_engine_performance_posted_at ON brand_engine_performance(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_engine_performance_rating ON brand_engine_performance(performance);

-- Experiments
-- Stores A/B tests and experiments
CREATE TABLE IF NOT EXISTS brand_engine_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  hypothesis TEXT NOT NULL,
  variable VARCHAR(100) NOT NULL,
  control TEXT NOT NULL,
  test TEXT NOT NULL,
  metric VARCHAR(100) NOT NULL,
  target_lift NUMERIC(5,2),
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for brand_engine_experiments
CREATE INDEX IF NOT EXISTS idx_brand_engine_experiments_user_id ON brand_engine_experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_engine_experiments_status ON brand_engine_experiments(status);
CREATE INDEX IF NOT EXISTS idx_brand_engine_experiments_start_date ON brand_engine_experiments(start_date);

-- Performance Insights
-- Stores generated insights about content performance
CREATE TABLE IF NOT EXISTS brand_engine_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  insight_type VARCHAR(20) CHECK (insight_type IN ('pattern', 'winner', 'loser', 'anomaly', 'recommendation')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  data_points INTEGER,
  timeframe VARCHAR(100),
  suggested_action TEXT,
  is_active BOOLEAN DEFAULT true,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for brand_engine_insights
CREATE INDEX IF NOT EXISTS idx_brand_engine_insights_user_id ON brand_engine_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_engine_insights_type ON brand_engine_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_brand_engine_insights_active ON brand_engine_insights(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_engine_insights_generated_at ON brand_engine_insights(generated_at DESC);

-- Weekly Briefs
-- Stores generated weekly content briefs
CREATE TABLE IF NOT EXISTS brand_engine_weekly_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  engine_run_id UUID REFERENCES brand_engine_runs(id) ON DELETE SET NULL,
  week_of DATE NOT NULL,
  what_matters JSONB DEFAULT '[]'::jsonb,
  content_calendar JSONB DEFAULT '[]'::jsonb,
  experiments_to_run JSONB DEFAULT '[]'::jsonb,
  dont_forget JSONB DEFAULT '[]'::jsonb,
  reasoning TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for brand_engine_weekly_briefs
CREATE INDEX IF NOT EXISTS idx_brand_engine_weekly_briefs_user_id ON brand_engine_weekly_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_engine_weekly_briefs_week_of ON brand_engine_weekly_briefs(week_of DESC);
CREATE INDEX IF NOT EXISTS idx_brand_engine_weekly_briefs_current ON brand_engine_weekly_briefs(is_current);

-- Daily Plans
-- Stores generated daily content plans
CREATE TABLE IF NOT EXISTS brand_engine_daily_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  engine_run_id UUID REFERENCES brand_engine_runs(id) ON DELETE SET NULL,
  weekly_brief_id UUID REFERENCES brand_engine_weekly_briefs(id) ON DELETE SET NULL,
  plan_date DATE NOT NULL,
  what_to_post_today JSONB DEFAULT '[]'::jsonb,
  stories_to_post JSONB DEFAULT '[]'::jsonb,
  engagement_priorities JSONB DEFAULT '[]'::jsonb,
  skip_today VARCHAR(255),
  reasoning TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for brand_engine_daily_plans
CREATE INDEX IF NOT EXISTS idx_brand_engine_daily_plans_user_id ON brand_engine_daily_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_engine_daily_plans_date ON brand_engine_daily_plans(plan_date DESC);

-- Competitors List
-- Stores list of competitors to track
CREATE TABLE IF NOT EXISTS brand_engine_competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  handle VARCHAR(255) NOT NULL,
  platform VARCHAR(20) CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'linkedin')),
  category VARCHAR(100),
  why_tracking TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, handle, platform)
);

-- Indexes for brand_engine_competitors
CREATE INDEX IF NOT EXISTS idx_brand_engine_competitors_user_id ON brand_engine_competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_engine_competitors_active ON brand_engine_competitors(is_active);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_brand_engine_runs_updated_at ON brand_engine_runs CASCADE;

CREATE TRIGGER update_brand_engine_runs_updated_at BEFORE UPDATE ON brand_engine_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_engine_signals_updated_at ON brand_engine_signals CASCADE;

CREATE TRIGGER update_brand_engine_signals_updated_at BEFORE UPDATE ON brand_engine_signals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_engine_performance_updated_at ON brand_engine_performance CASCADE;

CREATE TRIGGER update_brand_engine_performance_updated_at BEFORE UPDATE ON brand_engine_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_engine_experiments_updated_at ON brand_engine_experiments CASCADE;

CREATE TRIGGER update_brand_engine_experiments_updated_at BEFORE UPDATE ON brand_engine_experiments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_engine_competitors_updated_at ON brand_engine_competitors CASCADE;

CREATE TRIGGER update_brand_engine_competitors_updated_at BEFORE UPDATE ON brand_engine_competitors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Record this migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('2026-01-29-create-brand-engine-tables', 'Create Brand Engine tables for runs, signals, performance, experiments, insights, briefs, and plans', NOW())
ON CONFLICT (version) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Brand Engine tables created successfully';
END $$;
