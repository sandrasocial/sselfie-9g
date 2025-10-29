-- Drop existing brand_assets table if it exists and recreate with correct schema
DROP TABLE IF EXISTS brand_assets CASCADE;

-- Create brand_assets table with correct schema
-- Changed user_id from INTEGER to TEXT to match users.id column type
CREATE TABLE brand_assets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_brand_assets_user_id ON brand_assets(user_id);
