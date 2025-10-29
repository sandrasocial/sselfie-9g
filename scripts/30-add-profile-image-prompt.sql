-- Add profile_image_prompt column to feed_layouts table
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS profile_image_prompt TEXT;

-- Update existing feed layouts to have a default prompt if needed
UPDATE feed_layouts
SET profile_image_prompt = 'A professional, elegant profile picture with neutral tones and minimalist aesthetic'
WHERE profile_image_prompt IS NULL;
