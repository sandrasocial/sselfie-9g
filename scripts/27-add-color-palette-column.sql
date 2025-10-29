-- Add color_palette column to store custom brand colors
ALTER TABLE user_personal_brand
ADD COLUMN IF NOT EXISTS color_palette JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN user_personal_brand.color_palette IS 'Stores custom brand colors as JSONB array of color objects with name and hex values';
