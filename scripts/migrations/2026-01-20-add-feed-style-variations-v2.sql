-- Feed Planner V2: style variations + per-feed selection

CREATE TABLE IF NOT EXISTS feed_style_variations_v2 (
  id SERIAL PRIMARY KEY,
  feed_style_id INTEGER NOT NULL REFERENCES feed_styles_v2(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS feed_style_variations_v2_style_name_unique
  ON feed_style_variations_v2 (feed_style_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS feed_style_variations_v2_default_unique
  ON feed_style_variations_v2 (feed_style_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS feed_style_variations_v2_style_idx
  ON feed_style_variations_v2 (feed_style_id);

ALTER TABLE feed_style_previews_v2
  ADD COLUMN IF NOT EXISTS variation_id INTEGER REFERENCES feed_style_variations_v2(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS feed_style_previews_v2_variation_idx
  ON feed_style_previews_v2 (variation_id);

DROP INDEX IF EXISTS feed_style_previews_v2_primary_unique;
CREATE UNIQUE INDEX IF NOT EXISTS feed_style_previews_v2_primary_unique
  ON feed_style_previews_v2 (feed_style_id, variation_id)
  WHERE is_primary = true;

ALTER TABLE scene_prompts_v2
  ADD COLUMN IF NOT EXISTS variation_id INTEGER REFERENCES feed_style_variations_v2(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS scene_prompts_v2_variation_idx
  ON scene_prompts_v2 (variation_id);

DROP INDEX IF EXISTS scene_prompts_v2_primary_unique;
CREATE UNIQUE INDEX IF NOT EXISTS scene_prompts_v2_primary_unique
  ON scene_prompts_v2 (feed_style_id, position, variation_id, is_primary)
  WHERE is_primary = true;

ALTER TABLE feed_layouts
  ADD COLUMN IF NOT EXISTS feed_style_variation_id INTEGER REFERENCES feed_style_variations_v2(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS feed_layouts_style_variation_idx
  ON feed_layouts (feed_style_variation_id);
