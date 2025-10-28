-- Feed Designer Tables

-- Feed layouts table
CREATE TABLE IF NOT EXISTS feed_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  description TEXT,
  grid_order JSONB, -- Array of image IDs in order [1,2,3,4,5,6,7,8,9]
  profile_data JSONB, -- {profileImage, name, handle, bio, highlights}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Feed posts table (stores individual posts in a feed)
CREATE TABLE IF NOT EXISTS feed_posts (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 1-9 for grid position
  image_id INTEGER REFERENCES generated_images(id) ON DELETE SET NULL,
  title VARCHAR(255),
  description TEXT,
  prompt TEXT,
  category VARCHAR(100),
  text_overlay JSONB, -- {text, position, font, color}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Carousel posts table
CREATE TABLE IF NOT EXISTS carousel_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  caption TEXT,
  hashtags TEXT[],
  image_ids INTEGER[], -- Array of generated_images IDs
  text_overlays JSONB, -- Array of {imageId, text, style, position}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Instagram bios table
CREATE TABLE IF NOT EXISTS instagram_bios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bio_text TEXT,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Highlight covers table
CREATE TABLE IF NOT EXISTS highlight_covers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100),
  cover_image_id INTEGER REFERENCES generated_images(id) ON DELETE SET NULL,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_layouts_user_id ON feed_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_feed_layout_id ON feed_posts(feed_layout_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_carousel_posts_user_id ON carousel_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_bios_user_id ON instagram_bios(user_id);
CREATE INDEX IF NOT EXISTS idx_highlight_covers_user_id ON highlight_covers(user_id);
