-- Add error_message column to user_models table
ALTER TABLE user_models 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Migrate existing failure_reason data to error_message
UPDATE user_models 
SET error_message = failure_reason 
WHERE failure_reason IS NOT NULL AND error_message IS NULL;
