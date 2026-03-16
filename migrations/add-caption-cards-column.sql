-- Add caption_cards column to maya_chat_messages table
-- This matches the concept_cards and feed_cards column pattern for consistency

ALTER TABLE maya_chat_messages
ADD COLUMN IF NOT EXISTS caption_cards JSONB;

-- Add comment
COMMENT ON COLUMN maya_chat_messages.caption_cards IS 'Persisted Instagram caption cards generated inline by Maya — array of { caption: string, hashtags: string[] }';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_caption_cards
ON maya_chat_messages USING GIN (caption_cards)
WHERE caption_cards IS NOT NULL;
