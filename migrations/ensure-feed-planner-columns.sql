-- Migration: Ensure all required columns exist for Feed Planner
-- Date: 2025-01-30
-- Purpose: Ensure feed_layouts and feed_posts have all columns needed for the new create-from-strategy endpoint
-- Rollback: N/A (uses IF NOT EXISTS, safe to run multiple times)

-- Ensure feed_layouts has all required columns
ALTER TABLE feed_layouts
  ADD COLUMN IF NOT EXISTS username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS business_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS brand_vibe VARCHAR(255),
  ADD COLUMN IF NOT EXISTS layout_type VARCHAR(50) DEFAULT 'grid_3x3',
  ADD COLUMN IF NOT EXISTS visual_rhythm TEXT,
  ADD COLUMN IF NOT EXISTS feed_story TEXT,
  ADD COLUMN IF NOT EXISTS color_palette TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Ensure feed_posts has all required columns
ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS content_pillar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS post_status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS generation_mode VARCHAR(10) DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS pro_mode_type VARCHAR(50);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feed_layouts_username ON feed_layouts(username);
CREATE INDEX IF NOT EXISTS idx_feed_posts_content_pillar ON feed_posts(content_pillar);
CREATE INDEX IF NOT EXISTS idx_feed_posts_post_status ON feed_posts(post_status);
CREATE INDEX IF NOT EXISTS idx_feed_posts_generation_mode ON feed_posts(generation_mode);
CREATE INDEX IF NOT EXISTS idx_feed_posts_pro_mode_type ON feed_posts(pro_mode_type);

-- Add check constraint for generation_mode if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'feed_posts_generation_mode_check'
  ) THEN
    ALTER TABLE feed_posts 
    ADD CONSTRAINT feed_posts_generation_mode_check 
    CHECK (generation_mode IN ('classic', 'pro'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN feed_layouts.username IS 'Instagram username for this feed';
COMMENT ON COLUMN feed_layouts.brand_name IS 'Brand name for this feed';
COMMENT ON COLUMN feed_posts.content_pillar IS 'Content category/pillar for this post';
COMMENT ON COLUMN feed_posts.post_status IS 'Post status: draft, scheduled, posted';
COMMENT ON COLUMN feed_posts.generation_mode IS 'Generation mode: classic (uses trained model) or pro (uses reference images)';
COMMENT ON COLUMN feed_posts.pro_mode_type IS 'Pro Mode type: carousel-slides, text-overlay, quote-graphic, educational, workbench, etc.';






