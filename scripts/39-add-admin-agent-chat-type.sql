-- Add 'admin_agent' to the chat_type check constraint

-- Drop the existing constraint
ALTER TABLE maya_chats 
DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check;

-- Add the new constraint with 'admin_agent' included
ALTER TABLE maya_chats 
ADD CONSTRAINT maya_chats_chat_type_check 
CHECK (chat_type IN ('maya', 'feed-designer', 'admin_agent'));
