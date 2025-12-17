-- Add is_test flag to user_models table to filter out test models in production
-- This prevents test models created through admin Maya testing from affecting production users

ALTER TABLE user_models 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_user_models_is_test ON user_models(user_id, is_test) WHERE is_test = false;

-- Update existing rows to ensure they're not marked as test (safety measure)
UPDATE user_models 
SET is_test = false 
WHERE is_test IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_models.is_test IS 'Flag to mark test models created through admin Maya testing. Production queries should filter these out.';
