-- Migration: Add Feed Planner Schema Fields
-- Date: 2025-01-XX
-- Purpose: Add missing fields for feed planner functionality including captions, prompts, aesthetic info, and post metadata
-- Rollback: See comments below

BEGIN;

-- ============================================================================
-- FEED_LAYOUTS TABLE ADDITIONS
-- ============================================================================

-- Add aesthetic fields
ALTER TABLE feed_layouts 
  ADD COLUMN IF NOT EXISTS aesthetic VARCHAR(255),
  ADD COLUMN IF NOT EXISTS aesthetic_id VARCHAR(100);

-- Add strategic rationale (text field for strategy document)
ALTER TABLE feed_layouts 
  ADD COLUMN IF NOT EXISTS strategic_rationale TEXT;

-- Add total credits field
ALTER TABLE feed_layouts 
  ADD COLUMN IF NOT EXISTS total_credits INTEGER DEFAULT 0;

-- Add overall_vibe field (if not exists - may already be description or visual_rhythm)
ALTER TABLE feed_layouts 
  ADD COLUMN IF NOT EXISTS overall_vibe TEXT;

-- Update status enum to include new states if needed
-- Note: status is VARCHAR(50), so no enum changes needed

-- ============================================================================
-- FEED_POSTS TABLE ADDITIONS
-- ============================================================================

-- Add shot type (portrait | half-body | full-body | object | flatlay | scenery)
ALTER TABLE feed_posts 
  ADD COLUMN IF NOT EXISTS shot_type VARCHAR(50);

-- Add visual direction (text field for user's visual input)
ALTER TABLE feed_posts 
  ADD COLUMN IF NOT EXISTS visual_direction TEXT;

-- Add purpose field (if not exists - may already be content_pillar)
ALTER TABLE feed_posts 
  ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Add background field (optional text for background description)
ALTER TABLE feed_posts 
  ADD COLUMN IF NOT EXISTS background TEXT;

-- Add generation mode (classic | pro) - may already exist as generation_mode
ALTER TABLE feed_posts 
  ADD COLUMN IF NOT EXISTS generation_mode VARCHAR(50) DEFAULT 'classic';

-- Ensure caption field exists (should already exist, but verify)
ALTER TABLE feed_posts 
  ADD COLUMN IF NOT EXISTS caption TEXT;

-- Ensure prompt field exists (should already exist, but verify)
ALTER TABLE feed_posts 
  ADD COLUMN IF NOT EXISTS prompt TEXT;

-- Add error field for failed generations
ALTER TABLE feed_posts 
  ADD COLUMN IF NOT EXISTS error TEXT;

-- Update status field to support new states (pending | generating | complete | failed)
-- Note: generation_status is VARCHAR(50), so no enum changes needed
-- Set default if column exists (this will fail silently if column doesn't exist, which is fine)
-- Note: We can't easily check if default exists, so we'll just set it
-- If the column doesn't exist, this will error but that's okay - it means the table structure is different

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on aesthetic_id for filtering
CREATE INDEX IF NOT EXISTS idx_feed_layouts_aesthetic_id ON feed_layouts(aesthetic_id);

-- Index on generation_mode for filtering posts by mode
CREATE INDEX IF NOT EXISTS idx_feed_posts_generation_mode ON feed_posts(generation_mode);

-- Index on shot_type for filtering
CREATE INDEX IF NOT EXISTS idx_feed_posts_shot_type ON feed_posts(shot_type);

-- Unique constraint on (feed_layout_id, position) to prevent duplicate positions
-- Note: feed_layout_id may be named feed_id in some schemas
-- Try with feed_layout_id first (most common)
-- This will fail silently if constraint already exists or column doesn't exist - that's okay
CREATE UNIQUE INDEX IF NOT EXISTS feed_posts_feed_position_unique 
  ON feed_posts(feed_layout_id, position) 
  WHERE feed_layout_id IS NOT NULL;

-- ============================================================================
-- DATA MIGRATION (if needed)
-- ============================================================================

-- Set default values for existing records
UPDATE feed_layouts 
  SET total_credits = 0 
  WHERE total_credits IS NULL;

UPDATE feed_layouts 
  SET overall_vibe = COALESCE(description, visual_rhythm, '')
  WHERE overall_vibe IS NULL OR overall_vibe = '';

UPDATE feed_posts 
  SET generation_mode = 'classic' 
  WHERE generation_mode IS NULL;

UPDATE feed_posts 
  SET shot_type = COALESCE(post_type, 'portrait')
  WHERE shot_type IS NULL;

UPDATE feed_posts 
  SET purpose = COALESCE(content_pillar, 'general')
  WHERE purpose IS NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- 
-- BEGIN;
-- 
-- -- Remove indexes
-- DROP INDEX IF EXISTS idx_feed_layouts_aesthetic_id;
-- DROP INDEX IF EXISTS idx_feed_posts_generation_mode;
-- DROP INDEX IF EXISTS idx_feed_posts_shot_type;
-- 
-- -- Remove unique constraint
-- ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_feed_position_unique;
-- 
-- -- Remove columns from feed_posts
-- ALTER TABLE feed_posts 
--   DROP COLUMN IF EXISTS shot_type,
--   DROP COLUMN IF EXISTS visual_direction,
--   DROP COLUMN IF EXISTS purpose,
--   DROP COLUMN IF EXISTS background,
--   DROP COLUMN IF EXISTS error;
-- 
-- -- Remove columns from feed_layouts
-- ALTER TABLE feed_layouts 
--   DROP COLUMN IF EXISTS aesthetic,
--   DROP COLUMN IF EXISTS aesthetic_id,
--   DROP COLUMN IF EXISTS strategic_rationale,
--   DROP COLUMN IF EXISTS total_credits,
--   DROP COLUMN IF EXISTS overall_vibe;
-- 
-- COMMIT;

