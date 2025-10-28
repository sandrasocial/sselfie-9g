-- Drop existing incomplete tables if they exist
DROP TABLE IF EXISTS feed_posts CASCADE;
DROP TABLE IF EXISTS carousel_posts CASCADE;
DROP TABLE IF EXISTS instagram_bios CASCADE;
DROP TABLE IF EXISTS highlight_covers CASCADE;
DROP TABLE IF EXISTS feed_layouts CASCADE;

-- Create feed_layouts table (main feed container)
CREATE TABLE feed_layouts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  layout_type VARCHAR(50) DEFAULT 'grid_3x3',
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feed_posts table (individual posts in the feed)
CREATE TABLE feed_posts (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER NOT NULL REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  post_type VARCHAR(50) NOT NULL,
  image_url TEXT,
  caption TEXT,
  text_overlay TEXT,
  text_overlay_style JSONB,
  prompt TEXT,
  generation_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create carousel_posts table (multi-image carousel posts)
CREATE TABLE carousel_posts (
  id SERIAL PRIMARY KEY,
  feed_post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  image_url TEXT,
  text_overlay TEXT,
  text_overlay_style JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create instagram_bios table (generated Instagram bios)
CREATE TABLE instagram_bios (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio_text TEXT NOT NULL,
  emoji_style VARCHAR(50),
  link_text VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create highlight_covers table (Instagram highlight cover images)
CREATE TABLE highlight_covers (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  image_url TEXT,
  icon_style VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_feed_posts_feed_layout_id ON feed_posts(feed_layout_id);
CREATE INDEX idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX idx_carousel_posts_feed_post_id ON carousel_posts(feed_post_id);
CREATE INDEX idx_feed_layouts_user_id ON feed_layouts(user_id);
