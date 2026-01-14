-- Create user_feed_rotation_state table
-- Tracks rotation indices for outfit/location/accessory selection per user+vibe+style combo
-- Ensures users get different content each time they generate a feed

BEGIN;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_feed_rotation_state (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  vibe VARCHAR(100) NOT NULL,
  fashion_style VARCHAR(50) NOT NULL,
  outfit_index INTEGER DEFAULT 0 NOT NULL,
  location_index INTEGER DEFAULT 0 NOT NULL,
  accessory_index INTEGER DEFAULT 0 NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_generations INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one rotation state per user+vibe+style combo
  CONSTRAINT unique_user_vibe_style UNIQUE (user_id, vibe, fashion_style)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_feed_rotation_user_id ON user_feed_rotation_state(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feed_rotation_vibe ON user_feed_rotation_state(vibe);
CREATE INDEX IF NOT EXISTS idx_user_feed_rotation_fashion_style ON user_feed_rotation_state(fashion_style);
CREATE INDEX IF NOT EXISTS idx_user_feed_rotation_composite ON user_feed_rotation_state(user_id, vibe, fashion_style);

-- Add comments for documentation
COMMENT ON TABLE user_feed_rotation_state IS 'Tracks rotation indices for dynamic template injection. Ensures users get different outfits/locations/accessories each feed.';
COMMENT ON COLUMN user_feed_rotation_state.outfit_index IS 'Current rotation index for outfit selection. Increments by 4 per feed (uses 4 outfits per feed).';
COMMENT ON COLUMN user_feed_rotation_state.location_index IS 'Current rotation index for location selection. Increments by 3 per feed (uses 3 locations per feed).';
COMMENT ON COLUMN user_feed_rotation_state.accessory_index IS 'Current rotation index for accessory selection. Increments by 2 per feed (uses 2 accessories per feed).';
COMMENT ON COLUMN user_feed_rotation_state.total_generations IS 'Total number of feeds generated with this vibe+style combo.';

COMMIT;
