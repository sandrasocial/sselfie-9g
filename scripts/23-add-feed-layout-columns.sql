-- Add missing columns to feed_layouts table
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS brand_vibe TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS color_palette JSONB,
ADD COLUMN IF NOT EXISTS visual_rhythm TEXT,
ADD COLUMN IF NOT EXISTS feed_story TEXT,
ADD COLUMN IF NOT EXISTS research_insights TEXT,
ADD COLUMN IF NOT EXISTS hashtags TEXT[];

-- Add missing columns to instagram_bios table if needed
ALTER TABLE instagram_bios
ADD COLUMN IF NOT EXISTS feed_layout_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE;

-- Add missing columns to instagram_highlights table if needed  
ALTER TABLE instagram_highlights
ADD COLUMN IF NOT EXISTS feed_layout_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_feed_layout_id ON feed_posts(feed_layout_id);
CREATE INDEX IF NOT EXISTS idx_instagram_bios_feed_layout_id ON instagram_bios(feed_layout_id);
CREATE INDEX IF NOT EXISTS idx_instagram_highlights_feed_layout_id ON instagram_highlights(feed_layout_id);
