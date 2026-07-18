CREATE TABLE IF NOT EXISTS suite_learning_plans (
  user_id BIGINT PRIMARY KEY,
  goal TEXT NOT NULL,
  recommendation JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suite_learning_plans_status
  ON suite_learning_plans(status, updated_at DESC);
