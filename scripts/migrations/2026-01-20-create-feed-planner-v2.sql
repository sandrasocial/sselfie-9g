-- Feed Planner V2 tables (fresh start, isolated from V1)

CREATE TABLE IF NOT EXISTS feed_styles_v2 (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  preview_prompt TEXT,
  preview_prompt_approved BOOLEAN NOT NULL DEFAULT false,
  preview_test_image_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scene_prompts_v2 (
  id SERIAL PRIMARY KEY,
  feed_style_id INTEGER NOT NULL REFERENCES feed_styles_v2(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  variation_name TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  test_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scene_prompts_v2_position_range CHECK (position >= 1 AND position <= 9)
);

CREATE UNIQUE INDEX IF NOT EXISTS scene_prompts_v2_primary_unique
  ON scene_prompts_v2 (feed_style_id, position, is_primary)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS scene_prompts_v2_style_position_idx
  ON scene_prompts_v2 (feed_style_id, position);

CREATE TABLE IF NOT EXISTS user_feed_generations_v2 (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  feed_style_id INTEGER NOT NULL REFERENCES feed_styles_v2(id) ON DELETE CASCADE,
  generation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompts_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_feed_generations_v2_user_date_idx
  ON user_feed_generations_v2 (user_id, generation_date DESC);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS use_feed_planner_v2 BOOLEAN NOT NULL DEFAULT false;
