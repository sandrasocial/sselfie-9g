CREATE TABLE IF NOT EXISTS suite_learning_plans (
  user_id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  recommendation JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The first production release created this column as BIGINT, but SSELFIE's
-- canonical users.id values are text UUIDs. Repair that released schema in
-- place while keeping this migration safe to run again.
ALTER TABLE suite_learning_plans
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

CREATE INDEX IF NOT EXISTS idx_suite_learning_plans_status
  ON suite_learning_plans(status, updated_at DESC);
