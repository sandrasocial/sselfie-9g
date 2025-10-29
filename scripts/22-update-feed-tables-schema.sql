-- Update feed_layouts table to match the code requirements
ALTER TABLE feed_layouts 
ADD COLUMN IF NOT EXISTS brand_vibe VARCHAR(255),
ADD COLUMN IF NOT EXISTS business_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS color_palette TEXT,
ADD COLUMN IF NOT EXISTS visual_rhythm TEXT,
ADD COLUMN IF NOT EXISTS feed_story TEXT,
ADD COLUMN IF NOT EXISTS research_insights TEXT;

-- Create instagram_bios table if it doesn't exist
CREATE TABLE IF NOT EXISTS instagram_bios (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE,
  bio_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create instagram_highlights table if it doesn't exist
CREATE TABLE IF NOT EXISTS instagram_highlights (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Handle feed_posts table columns more carefully to avoid conflicts
-- First, rename feed_layout_id to feed_id if it exists and feed_id doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feed_posts' AND column_name = 'feed_layout_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feed_posts' AND column_name = 'feed_id'
  ) THEN
    ALTER TABLE feed_posts RENAME COLUMN feed_layout_id TO feed_id;
  END IF;
END $$;

-- Then add feed_id if it doesn't exist (and wasn't just renamed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feed_posts' AND column_name = 'feed_id'
  ) THEN
    ALTER TABLE feed_posts ADD COLUMN feed_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add other columns if they don't exist
ALTER TABLE feed_posts
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS hashtags TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_instagram_bios_feed_id ON instagram_bios(feed_id);
CREATE INDEX IF NOT EXISTS idx_instagram_highlights_feed_id ON instagram_highlights(feed_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_feed_id ON feed_posts(feed_id);
