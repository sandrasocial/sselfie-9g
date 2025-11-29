-- PHASE 7 — BLOCK 6: Intelligent Funnel Testing + A/B Adaptive Learning
-- A/B testing tables for funnel experimentation

-- Experiments table
CREATE TABLE IF NOT EXISTS funnel_experiments (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  traffic_split JSONB DEFAULT '{"A": 0.5, "B": 0.5}',
  winning_variant TEXT,
  last_evaluated_at TIMESTAMPTZ
);

-- Variants table
CREATE TABLE IF NOT EXISTS funnel_variants (
  id SERIAL PRIMARY KEY,
  experiment_id INTEGER NOT NULL REFERENCES funnel_experiments(id),
  variant TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B events table
CREATE TABLE IF NOT EXISTS funnel_ab_events (
  id SERIAL PRIMARY KEY,
  experiment_id INTEGER NOT NULL REFERENCES funnel_experiments(id),
  variant TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  event TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_funnel_ab_events_experiment_variant ON funnel_ab_events (experiment_id, variant);
CREATE INDEX IF NOT EXISTS idx_funnel_ab_events_session ON funnel_ab_events (session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_experiments_slug ON funnel_experiments (slug);
CREATE INDEX IF NOT EXISTS idx_funnel_experiments_status ON funnel_experiments (status);

-- Developer note: This is Neon-only SQL, no Supabase RLS
