ALTER TABLE feed_layouts
  ADD COLUMN IF NOT EXISTS visual_direction_mode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS visual_direction_brief TEXT,
  ADD COLUMN IF NOT EXISTS inspiration_image_url TEXT;
