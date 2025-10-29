-- Complete feed designer schema migration
-- This script creates all necessary tables and columns for the feed designer

-- First, ensure feed_layouts has all required columns
ALTER TABLE feed_layouts 
  ADD COLUMN IF NOT EXISTS brand_vibe TEXT,
  ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color_palette TEXT,
  ADD COLUMN IF NOT EXISTS visual_rhythm TEXT,
  ADD COLUMN IF NOT EXISTS feed_story TEXT,
  ADD COLUMN IF NOT EXISTS research_insights TEXT,
  ADD COLUMN IF NOT EXISTS hashtags TEXT[];

-- Create instagram_highlights table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS instagram_highlights (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER NOT NULL REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  image_url TEXT,
  icon_style VARCHAR(50),
  prompt TEXT,
  generation_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create instagram_bios table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS instagram_bios (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER NOT NULL REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio_text TEXT NOT NULL,
  emoji_style VARCHAR(50),
  link_text VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add feed_layout_id to instagram_bios if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instagram_bios' AND column_name = 'feed_layout_id'
  ) THEN
    ALTER TABLE instagram_bios ADD COLUMN feed_layout_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instagram_highlights_feed_layout_id ON instagram_highlights(feed_layout_id);
CREATE INDEX IF NOT EXISTS idx_instagram_highlights_user_id ON instagram_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_bios_feed_layout_id ON instagram_bios(feed_layout_id);
CREATE INDEX IF NOT EXISTS idx_instagram_bios_user_id ON instagram_bios(user_id);

-- Update any existing data to ensure consistency
UPDATE feed_layouts SET status = 'draft' WHERE status IS NULL;
UPDATE feed_posts SET generation_status = 'pending' WHERE generation_status IS NULL;
