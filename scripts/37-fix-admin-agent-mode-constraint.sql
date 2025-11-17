-- Fix admin_agent_chats mode constraint
-- The constraint was rejecting NULL and 'general', but we need to allow NULL for general chats
-- and specific modes for tool-focused chats

-- Drop the existing check constraint
ALTER TABLE admin_agent_chats 
DROP CONSTRAINT IF EXISTS admin_agent_chats_mode_check;

-- Make the column nullable first to allow NULL for general chats
ALTER TABLE admin_agent_chats 
ALTER COLUMN agent_mode DROP NOT NULL;

-- Add the correct constraint with all valid agent modes
-- NULL = general chat, specific values = tool-focused chat
ALTER TABLE admin_agent_chats 
ADD CONSTRAINT admin_agent_chats_mode_check 
CHECK (agent_mode IS NULL OR agent_mode IN ('instagram', 'email', 'content', 'analytics', 'competitor', 'research'));

-- Add comment explaining the modes
COMMENT ON COLUMN admin_agent_chats.agent_mode IS 'The active tool/mode for this chat: instagram, email, content, analytics, competitor, research, or NULL for general chat';

-- Update any existing chats with invalid mode to NULL
UPDATE admin_agent_chats 
SET agent_mode = NULL 
WHERE agent_mode NOT IN ('instagram', 'email', 'content', 'analytics', 'competitor', 'research');
