-- Migration: Add feed_style_variation_id to user_personal_brand
-- Purpose: Persist user's selected V2 feed style variation

BEGIN;

ALTER TABLE user_personal_brand
ADD COLUMN IF NOT EXISTS feed_style_variation_id INTEGER
  REFERENCES feed_style_variations_v2(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_personal_brand_feed_style_variation_id
  ON user_personal_brand(feed_style_variation_id);

-- Record migration in schema_migrations (version column)
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('2026-01-20-add-feed-style-variation-to-personal-brand')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verification (run separately)
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'user_personal_brand'
--   AND column_name = 'feed_style_variation_id';
