-- Add 'prompt_builder' as a valid chat_type value for Admin Prompt Builder mode
-- This migration updates the CHECK constraint to include 'prompt_builder' alongside existing values

-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'maya_chats_chat_type_check'
  ) THEN
    ALTER TABLE maya_chats DROP CONSTRAINT maya_chats_chat_type_check;
    RAISE NOTICE 'Dropped existing chat_type constraint';
  END IF;
END $$;

-- Add new constraint that includes 'prompt_builder'
ALTER TABLE maya_chats 
ADD CONSTRAINT maya_chats_chat_type_check 
CHECK (chat_type IN ('maya', 'feed-designer', 'pro', 'prompt_builder'));

-- Update the comment to reflect the new chat type
COMMENT ON COLUMN maya_chats.chat_type IS 'Type of chat: maya (regular Maya conversations), feed-designer (Instagram feed design chats), pro (Studio Pro mode chats), or prompt_builder (Admin Prompt Builder chats)';

-- Verify the constraint was added
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated chat_type constraint to include: maya, feed-designer, pro, prompt_builder';
END $$;








