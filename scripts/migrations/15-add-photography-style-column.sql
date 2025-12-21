-- Add photography_style column to user_personal_brand table
-- Supports 'authentic' (iPhone/influencer style - default) and 'editorial' (Professional DSLR/magazine quality)
-- Part of Maya Pro Mode photography styles system

-- Add column to user_personal_brand table
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS photography_style VARCHAR(20) DEFAULT 'authentic';

-- Add check constraint to ensure only valid values
ALTER TABLE user_personal_brand
DROP CONSTRAINT IF EXISTS check_photography_style;

ALTER TABLE user_personal_brand
ADD CONSTRAINT check_photography_style 
CHECK (photography_style IN ('authentic', 'editorial'));

-- Add index for filtering by photography style
CREATE INDEX IF NOT EXISTS idx_user_personal_brand_photography_style 
ON user_personal_brand(photography_style);

-- Add table comment
COMMENT ON COLUMN user_personal_brand.photography_style IS 'Photography style preference: authentic (iPhone/influencer - default) or editorial (Professional DSLR/magazine quality)';
