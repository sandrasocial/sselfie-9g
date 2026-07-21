-- Additive, idempotent request-cost telemetry and daily Maya recommendation caching.
-- Prompt and response content are intentionally not stored in the usage table.

CREATE TABLE IF NOT EXISTS maya_ai_usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  feature TEXT NOT NULL,
  task TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  generation_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  no_cache_input_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  provider_cost_usd NUMERIC(12, 6),
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  finish_reason TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  request_chars INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maya_ai_usage_feature_created
  ON maya_ai_usage_events(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maya_ai_usage_user_created
  ON maya_ai_usage_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_v3_maya_recommendation_cache (
  user_id TEXT NOT NULL,
  cache_day DATE NOT NULL DEFAULT CURRENT_DATE,
  context_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cache_day, context_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_maya_recommendation_cache_created
  ON app_v3_maya_recommendation_cache(created_at DESC);
