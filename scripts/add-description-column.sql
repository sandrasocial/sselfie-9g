-- Add description column to generated_images table
ALTER TABLE generated_images 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_images_description 
ON generated_images(description);

-- Update existing records to use prompt as description (optional)
-- UPDATE generated_images 
-- SET description = prompt 
-- WHERE description IS NULL;
