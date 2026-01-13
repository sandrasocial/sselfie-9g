-- Add feed_planner_welcome_shown column to user_personal_brand table
-- Phase 3: Welcome Wizard tracking

BEGIN;

-- Add column if it doesn't exist
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS feed_planner_welcome_shown BOOLEAN DEFAULT false;

-- Update existing records to false (not shown)
UPDATE user_personal_brand
SET feed_planner_welcome_shown = false
WHERE feed_planner_welcome_shown IS NULL;

COMMIT;

-- Verification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_personal_brand'
AND column_name = 'feed_planner_welcome_shown';
