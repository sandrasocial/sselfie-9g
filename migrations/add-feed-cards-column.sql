-- Add feed_cards column to maya_chat_messages table
-- This matches the concept_cards column pattern for consistency

ALTER TABLE maya_chat_messages
ADD COLUMN IF NOT EXISTS feed_cards JSONB;

-- Add comment
COMMENT ON COLUMN maya_chat_messages.feed_cards IS 'Feed cards data (similar to concept_cards). Previously stored in styling_details.';

-- Migrate existing data from styling_details to feed_cards
-- Only migrate if styling_details contains feedStrategy (feed card data)
UPDATE maya_chat_messages
SET feed_cards = styling_details
WHERE styling_details IS NOT NULL
  AND styling_details::text LIKE '%"feedStrategy"%'
  AND feed_cards IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_feed_cards 
ON maya_chat_messages USING GIN (feed_cards)
WHERE feed_cards IS NOT NULL;

