-- Update maya_chats to support feed designer context
-- The table already exists, we just need to ensure it has the right structure

-- Add feed_layout_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maya_chats' AND column_name = 'feed_layout_id'
  ) THEN
    ALTER TABLE maya_chats ADD COLUMN feed_layout_id INTEGER;
    ALTER TABLE maya_chats ADD CONSTRAINT fk_feed_layout 
      FOREIGN KEY (feed_layout_id) REFERENCES feed_layouts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add context column if it doesn't exist (for storing agent coordination data)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maya_chats' AND column_name = 'context'
  ) THEN
    ALTER TABLE maya_chats ADD COLUMN context JSONB;
  END IF;
END $$;

-- Create index for feed_layout_id lookups
CREATE INDEX IF NOT EXISTS idx_maya_chats_feed_layout_id ON maya_chats(feed_layout_id);

-- Update chat_type to include 'feed_designer' if not already there
-- This allows us to distinguish feed designer chats from other chat types
