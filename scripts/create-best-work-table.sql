-- Create table for storing user's best work selections
CREATE TABLE IF NOT EXISTS user_best_work (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  image_id VARCHAR(255) NOT NULL,
  image_source VARCHAR(50) NOT NULL, -- 'ai_images' or 'generated_images'
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, image_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_best_work_user_id ON user_best_work(user_id);
CREATE INDEX IF NOT EXISTS idx_user_best_work_display_order ON user_best_work(user_id, display_order);
