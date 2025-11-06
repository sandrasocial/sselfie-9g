-- Create academy_flatlay_images table
CREATE TABLE IF NOT EXISTS academy_flatlay_images (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  resource_type TEXT NOT NULL, -- 'canva', 'pdf', 'drive', 'image', 'other'
  resource_url TEXT NOT NULL,
  category TEXT, -- 'lifestyle', 'workspace', 'product', etc.
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_academy_flatlay_images_status ON academy_flatlay_images(status);
CREATE INDEX IF NOT EXISTS idx_academy_flatlay_images_category ON academy_flatlay_images(category);
CREATE INDEX IF NOT EXISTS idx_academy_flatlay_images_order ON academy_flatlay_images(order_index);

-- Note: Download tracking is handled by the existing user_resource_downloads table
-- with resource_type = 'flatlay-image' and resource_id = academy_flatlay_images.id
-- This follows the same pattern as templates and monthly drops
