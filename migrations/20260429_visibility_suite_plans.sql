CREATE TABLE IF NOT EXISTS visibility_suite_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  source_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visibility_suite_plans_user_id
  ON visibility_suite_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_visibility_suite_plans_access_token
  ON visibility_suite_plans(access_token);
