-- Add NOT NULL constraint and check constraint on chat_type
-- This ensures all chats have a valid chat_type and prevents future NULL values

-- Step 1: Update existing NULL values to 'maya' (default for legacy chats)
UPDATE maya_chats
SET chat_type = 'maya'
WHERE chat_type IS NULL;

-- Step 2: Add NOT NULL constraint
ALTER TABLE maya_chats
ALTER COLUMN chat_type SET NOT NULL;

-- Step 3: Add check constraint to ensure valid chat_type values
ALTER TABLE maya_chats
ADD CONSTRAINT chat_type_check 
CHECK (chat_type IN ('maya', 'pro', 'feed-planner'));

-- Step 4: Add comment for documentation
COMMENT ON COLUMN maya_chats.chat_type IS 'Chat type: maya (Classic Photos), pro (Pro Photos), feed-planner (Feed Tab). Required for tab separation.';

