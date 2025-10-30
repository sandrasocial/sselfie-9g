-- Add username and brand_name columns to feed_layouts table
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_feed_layouts_username ON feed_layouts(username);
