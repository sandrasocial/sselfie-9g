-- Add status column to feed_layouts if it doesn't exist
ALTER TABLE feed_layouts 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feed_layouts_status ON feed_layouts(status);

-- Update existing feeds to have draft status
UPDATE feed_layouts SET status = 'draft' WHERE status IS NULL;
