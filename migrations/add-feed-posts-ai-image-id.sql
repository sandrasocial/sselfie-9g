-- Migration: Add ai_image_id to feed_posts
-- Purpose: Feed Planner Phase 2c (Maya places a chat-generated photo onto the calendar).
-- feed_posts.image_url was a plain URL string with no link back to the ai_images row it came
-- from. A nullable FK gives real integrity for that link instead of fragile URL-string
-- matching, without touching any existing row (additive, no backfill).

ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS ai_image_id INTEGER REFERENCES ai_images(id);

CREATE INDEX IF NOT EXISTS idx_feed_posts_ai_image_id
  ON feed_posts(ai_image_id)
  WHERE ai_image_id IS NOT NULL;
