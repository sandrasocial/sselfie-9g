-- Migration: Add 'feed-planner' as a valid chat_type value for Feed Planner mode
-- Date: 2025-01-30
-- Purpose: Enable Feed Planner to use dedicated chat type for context isolation
-- Rollback: ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check; ALTER TABLE maya_chats ADD CONSTRAINT maya_chats_chat_type_check CHECK (chat_type IN ('maya', 'feed-designer', 'pro', 'prompt_builder'));

-- Drop the existing constraint if it exists
ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check;

-- Add new constraint that includes 'feed-planner'
ALTER TABLE maya_chats 
ADD CONSTRAINT maya_chats_chat_type_check 
CHECK (chat_type IN ('maya', 'feed-designer', 'pro', 'prompt_builder', 'feed-planner'));

-- Update the comment to reflect the new chat type
COMMENT ON COLUMN maya_chats.chat_type IS 'Type of chat: maya (regular Maya conversations), feed-designer (Instagram feed design chats), pro (Studio Pro mode chats), prompt_builder (Admin Prompt Builder chats), or feed-planner (Feed Planner strategy creation chats)';

