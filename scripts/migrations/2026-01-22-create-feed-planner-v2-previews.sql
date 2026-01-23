-- Feed Planner V2 preview prompts (multiple per style)

CREATE TABLE IF NOT EXISTS feed_style_previews_v2 (
  id SERIAL PRIMARY KEY,
  feed_style_id INTEGER NOT NULL REFERENCES feed_styles_v2(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  test_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS feed_style_previews_v2_primary_unique
  ON feed_style_previews_v2 (feed_style_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS feed_style_previews_v2_style_idx
  ON feed_style_previews_v2 (feed_style_id);
