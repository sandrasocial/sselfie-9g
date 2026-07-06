-- App V3 gallery readability + variant lineage.
-- Safe additive migration: existing gallery rows remain valid.

ALTER TABLE ai_images
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE ai_images
  ADD COLUMN IF NOT EXISTS variant_of INTEGER REFERENCES ai_images(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_images_variant_of ON ai_images(variant_of);

