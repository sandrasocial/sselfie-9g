-- Add physical_preferences column to user_personal_brand table
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS physical_preferences TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN user_personal_brand.physical_preferences IS 'User-requested physical appearance modifications to apply to all image generations (e.g., "curvier body type, fuller bust, lighter blonde hair")';
