-- Create academy_templates table
CREATE TABLE IF NOT EXISTS academy_templates (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  resource_type TEXT NOT NULL, -- 'canva', 'pdf', 'drive', 'other'
  resource_url TEXT NOT NULL,
  category TEXT, -- 'social-media', 'branding', 'marketing', etc.
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create academy_monthly_drops table
CREATE TABLE IF NOT EXISTS academy_monthly_drops (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  resource_type TEXT NOT NULL, -- 'canva', 'pdf', 'drive', 'other'
  resource_url TEXT NOT NULL,
  month TEXT NOT NULL, -- 'January 2025', 'February 2025', etc.
  category TEXT,
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_academy_templates_status ON academy_templates(status);
CREATE INDEX IF NOT EXISTS idx_academy_templates_category ON academy_templates(category);
CREATE INDEX IF NOT EXISTS idx_academy_monthly_drops_status ON academy_monthly_drops(status);
CREATE INDEX IF NOT EXISTS idx_academy_monthly_drops_month ON academy_monthly_drops(month);

-- Create user download tracking table
CREATE TABLE IF NOT EXISTS user_resource_downloads (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  resource_type TEXT NOT NULL, -- 'template' or 'monthly_drop'
  resource_id INTEGER NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_resource_downloads_user ON user_resource_downloads(user_id);
