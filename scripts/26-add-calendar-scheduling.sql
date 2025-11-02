-- Add scheduling columns to feed_posts for content calendar
-- This enables users to plan when they want to post content

ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(20),
  ADD COLUMN IF NOT EXISTS content_pillar VARCHAR(50),
  ADD COLUMN IF NOT EXISTS post_status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Add indexes for efficient calendar queries
CREATE INDEX IF NOT EXISTS idx_feed_posts_scheduled_at ON feed_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_feed_posts_post_status ON feed_posts(post_status);
CREATE INDEX IF NOT EXISTS idx_feed_posts_content_pillar ON feed_posts(content_pillar);
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_scheduled ON feed_posts(user_id, scheduled_at);

-- Add comment to explain the columns
COMMENT ON COLUMN feed_posts.scheduled_at IS 'When the user plans to post this content';
COMMENT ON COLUMN feed_posts.scheduled_time IS 'Display time like "9:00 AM" for UI';
COMMENT ON COLUMN feed_posts.content_pillar IS 'Content category: education, inspiration, personal, promotion';
COMMENT ON COLUMN feed_posts.post_status IS 'Status: draft, scheduled, posted';
COMMENT ON COLUMN feed_posts.posted_at IS 'When the user actually posted to Instagram';
COMMENT ON COLUMN feed_posts.timezone IS 'User timezone for scheduling';
