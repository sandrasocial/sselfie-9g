-- Add photoshoot consistency fields to feed_layouts table
-- These fields enable Instagram carousel-style consistency across all 9 images

ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS photoshoot_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photoshoot_base_seed INTEGER,
ADD COLUMN IF NOT EXISTS photoshoot_base_outfit TEXT,
ADD COLUMN IF NOT EXISTS photoshoot_base_location TEXT,
ADD COLUMN IF NOT EXISTS photoshoot_base_hair TEXT,
ADD COLUMN IF NOT EXISTS photoshoot_base_accessories TEXT;

-- Add seed_variation to feed_posts for consistent but varied generations
ALTER TABLE feed_posts
ADD COLUMN IF NOT EXISTS seed_variation INTEGER DEFAULT 0;

-- Add index for faster photoshoot queries
CREATE INDEX IF NOT EXISTS idx_feed_layouts_photoshoot ON feed_layouts(photoshoot_enabled, user_id);

-- Update existing feeds to opt-in to photoshoot mode (optional - can be false by default)
-- COMMENT OUT if you want existing feeds to stay as-is
-- UPDATE feed_layouts SET photoshoot_enabled = false WHERE photoshoot_enabled IS NULL;

COMMENT ON COLUMN feed_layouts.photoshoot_enabled IS 'When true, all 9 images use consistent styling like a professional photoshoot';
COMMENT ON COLUMN feed_layouts.photoshoot_base_seed IS 'Base seed number for consistent facial features across all images';
COMMENT ON COLUMN feed_layouts.photoshoot_base_outfit IS 'Outfit description used across all 9 images';
COMMENT ON COLUMN feed_layouts.photoshoot_base_location IS 'Location setting used across all 9 images';
COMMENT ON COLUMN feed_posts.seed_variation IS 'Small variation added to base seed for pose diversity (+0, +1, +2, etc)';
