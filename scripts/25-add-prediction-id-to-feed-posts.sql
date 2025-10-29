-- Add prediction_id column to feed_posts table for tracking Replicate generations
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS prediction_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feed_posts_prediction_id ON feed_posts(prediction_id);
