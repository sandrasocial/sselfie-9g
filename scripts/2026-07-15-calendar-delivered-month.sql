-- CALENDAR-UPGRADE-01: queryable business-funded image generation.
-- Additive and idempotent. Apply before enabling CALENDAR_DELIVERED_MONTH_ENABLED.

ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS pregenerated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pregenerated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_feed_posts_pregenerated_week
  ON feed_posts (user_id, pregenerated_at DESC)
  WHERE pregenerated = TRUE;

COMMENT ON COLUMN feed_posts.pregenerated IS
  'True when SSELFIE funded the first image automatically for the delivered-month calendar.';

COMMENT ON COLUMN feed_posts.pregenerated_at IS
  'When the automatic delivered-month provider job was durably created; used for weekly spend caps.';
