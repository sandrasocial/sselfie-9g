-- Brand & Style Tables

-- User personal brand
CREATE TABLE IF NOT EXISTS user_personal_brand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  brand_name TEXT,
  brand_voice TEXT,
  brand_values TEXT[],
  target_audience TEXT,
  color_palette JSONB,
  typography JSONB,
  imagery_style TEXT,
  tone TEXT,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User style guides
CREATE TABLE IF NOT EXISTS user_styleguides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aesthetic_recipe TEXT,
  style_description TEXT,
  reference_images TEXT[],
  color_scheme JSONB,
  mood_keywords TEXT[],
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_personal_brand_user_id ON user_personal_brand(user_id);
CREATE INDEX IF NOT EXISTS idx_user_styleguides_user_id ON user_styleguides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_styleguides_default ON user_styleguides(user_id, is_default);
