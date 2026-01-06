-- Add strategy_document column to feed_strategy table
-- This column stores the full markdown strategy document
-- Strategy documents should NOT be stored in feed_layouts.description

ALTER TABLE feed_strategy 
ADD COLUMN IF NOT EXISTS strategy_document TEXT;

-- Add unique constraint on feed_layout_id to allow ON CONFLICT updates
-- This ensures one strategy document per feed
-- Note: This will fail if constraint already exists, which is fine
ALTER TABLE feed_strategy 
ADD CONSTRAINT feed_strategy_feed_layout_id_unique 
UNIQUE (feed_layout_id);

-- Add comment explaining the column
COMMENT ON COLUMN feed_strategy.strategy_document IS 'Full markdown strategy document. Should not be stored in feed_layouts.description to avoid showing in chat feed cards.';

