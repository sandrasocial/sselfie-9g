-- Migration: Expand feed_posts columns to support full AI-generated content
-- Purpose: Remove artificial VARCHAR(50) limits that truncate Claude's descriptions

-- Expand content_pillar to support full shot type descriptions
-- Examples: "Professional selfie establishing expertise and approachability"
ALTER TABLE feed_posts 
ALTER COLUMN content_pillar TYPE VARCHAR(255);

-- Expand post_type to support longer type descriptions if needed
ALTER TABLE feed_posts 
ALTER COLUMN post_type TYPE VARCHAR(100);

-- Add index for better query performance on content_pillar
CREATE INDEX IF NOT EXISTS idx_feed_posts_content_pillar ON feed_posts(content_pillar);

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Successfully expanded feed_posts columns to support full AI-generated content';
END $$;
