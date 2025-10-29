-- Add chat_type column to maya_chats table to distinguish between chat types
-- This allows filtering between regular Maya chats and feed designer chats

ALTER TABLE maya_chats 
ADD COLUMN IF NOT EXISTS chat_type TEXT DEFAULT 'maya' CHECK (chat_type IN ('maya', 'feed-designer'));

-- Add index for better query performance when filtering by chat type
CREATE INDEX IF NOT EXISTS idx_maya_chats_chat_type ON maya_chats(chat_type);

-- Add index for filtering by user and chat type together
CREATE INDEX IF NOT EXISTS idx_maya_chats_user_chat_type ON maya_chats(user_id, chat_type);

-- Update existing chats to have 'maya' as default type
UPDATE maya_chats SET chat_type = 'maya' WHERE chat_type IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN maya_chats.chat_type IS 'Type of chat: maya (regular Maya conversations) or feed-designer (Instagram feed design chats)';
