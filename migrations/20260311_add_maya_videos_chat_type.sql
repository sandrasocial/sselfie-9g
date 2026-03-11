-- Add canonical videos chat type to maya_chats.
-- This keeps tab-scoped Maya chats isolated at the persisted chat layer.

ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check;
ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS chat_type_check;

ALTER TABLE maya_chats
ADD CONSTRAINT maya_chats_chat_type_check
CHECK (chat_type IN ('maya', 'pro', 'videos', 'feed_planner', 'prompt_builder', 'pro-photoshoot'));

COMMENT ON COLUMN maya_chats.chat_type IS
  'Canonical Maya chat type. Supported values: maya, pro, videos, feed_planner, prompt_builder, pro-photoshoot.';
