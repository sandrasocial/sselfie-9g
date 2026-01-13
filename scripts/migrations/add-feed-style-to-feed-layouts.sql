-- Add feed_style column to feed_layouts table
-- This allows each feed to have its own style (luxury, minimal, beige)
-- independent of the user's profile settings

ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS feed_style VARCHAR(50);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_feed_layouts_feed_style ON feed_layouts(feed_style);

-- Add comment for documentation
COMMENT ON COLUMN feed_layouts.feed_style IS 'Feed style: luxury (dark & moody), minimal (light & minimalistic), or beige (beige aesthetic). Used for template selection during image generation.';
