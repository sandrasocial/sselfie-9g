-- User Image Libraries Table
-- Stores persistent image libraries for Pro Mode users
-- Part of Maya Pro Mode cleanup and implementation

CREATE TABLE IF NOT EXISTS user_image_libraries (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selfies JSONB DEFAULT '[]',
  products JSONB DEFAULT '[]',
  people JSONB DEFAULT '[]',
  vibes JSONB DEFAULT '[]',
  current_intent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_image_libraries_user_id ON user_image_libraries(user_id);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_image_libraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_image_libraries_updated_at
  BEFORE UPDATE ON user_image_libraries
  FOR EACH ROW
  EXECUTE FUNCTION update_user_image_libraries_updated_at();

-- Add table comment
COMMENT ON TABLE user_image_libraries IS 'Persistent image libraries for Pro Mode users. Stores selfies, products, people, and vibes images organized by category.';







