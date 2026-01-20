-- Migration: Add preview_image_url to feed_posts
-- Date: 2026-01-20
-- Purpose: Store preview feed image for all 9 posts

ALTER TABLE feed_posts
ADD COLUMN IF NOT EXISTS preview_image_url TEXT NULL;

COMMENT ON COLUMN feed_posts.preview_image_url IS 'Preview feed image URL for layout_type=preview (shared across 9 posts)';
