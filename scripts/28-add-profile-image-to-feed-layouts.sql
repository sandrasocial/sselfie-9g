-- Add profile_image_url column to feed_layouts table
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment
COMMENT ON COLUMN feed_layouts.profile_image_url IS 'URL of the generated profile image for this feed';
