-- Migration: Add Pro Mode support to feed_posts table
-- Date: 2025-01-30
-- Purpose: Enable Feed Planner to support Pro Mode generation (carousels, text overlays, quote graphics)
-- Rollback: ALTER TABLE feed_posts DROP COLUMN IF EXISTS generation_mode, DROP COLUMN IF EXISTS pro_mode_type;

-- Add Pro Mode columns to feed_posts table
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS generation_mode VARCHAR(10) DEFAULT 'classic' CHECK (generation_mode IN ('classic', 'pro'));

ALTER TABLE feed_posts
ADD COLUMN IF NOT EXISTS pro_mode_type VARCHAR(50);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_feed_posts_generation_mode ON feed_posts(generation_mode);
CREATE INDEX IF NOT EXISTS idx_feed_posts_pro_mode_type ON feed_posts(pro_mode_type);

-- Add comments for documentation
COMMENT ON COLUMN feed_posts.generation_mode IS 'Generation mode: classic (uses trained model) or pro (uses reference images)';
COMMENT ON COLUMN feed_posts.pro_mode_type IS 'Pro Mode type: carousel-slides, text-overlay, quote-graphic, educational, workbench, etc.';

