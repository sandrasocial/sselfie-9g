-- Keep every slide that belongs to one Calendar post. The first URL remains image_url so
-- existing grid previews continue to work without a second rendering path.
ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN feed_posts.media_urls IS
  'Ordered media for one Instagram post. Slide one is also stored in image_url as the grid cover.';
