-- Add chat_type column to maya_chats table to support different chat contexts
ALTER TABLE maya_chats 
ADD COLUMN IF NOT EXISTS chat_type VARCHAR(50) DEFAULT 'maya';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_maya_chats_user_type ON maya_chats(user_id, chat_type);

-- Update existing chats to have 'maya' type (main chat screen)
UPDATE maya_chats SET chat_type = 'maya' WHERE chat_type IS NULL;
