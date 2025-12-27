-- Instagram Captions Library
CREATE TABLE IF NOT EXISTS instagram_captions (
  id SERIAL PRIMARY KEY,
  caption_text TEXT NOT NULL,
  caption_type VARCHAR(50), -- "storytelling", "educational", "promotional", "motivational"
  hashtags TEXT[], -- Array of hashtags
  cta TEXT, -- Call to action
  image_description TEXT, -- What the photo is about
  tone VARCHAR(50), -- "warm", "professional", "excited", "reflective"
  word_count INTEGER,
  hook TEXT, -- First line/hook
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content Calendars
CREATE TABLE IF NOT EXISTS content_calendars (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration VARCHAR(50) NOT NULL, -- "week", "month", "quarter"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  platform VARCHAR(50), -- "instagram", "email", "both"
  calendar_data JSONB NOT NULL, -- {days: [{date, content, pillar, platform, notes}]}
  content_pillars TEXT[], -- Array of pillars used
  total_posts INTEGER,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maya Prompt Suggestions
CREATE TABLE IF NOT EXISTS maya_prompt_suggestions (
  id SERIAL PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  prompt_title VARCHAR(255), -- Short descriptive title
  category VARCHAR(100), -- "fashion", "lifestyle", "seasonal", "editorial", "brand"
  season VARCHAR(50), -- "spring", "summer", "fall", "winter", "holiday", "year-round"
  style VARCHAR(100), -- "luxury", "casual", "editorial", "minimalist", "bold"
  mood VARCHAR(100), -- "elegant", "playful", "sophisticated", "cozy", "powerful"
  tags TEXT[], -- Searchable tags
  use_case TEXT, -- When to use this prompt
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_instagram_captions_created_by ON instagram_captions(created_by);
CREATE INDEX IF NOT EXISTS idx_instagram_captions_created_at ON instagram_captions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_captions_type ON instagram_captions(caption_type);

CREATE INDEX IF NOT EXISTS idx_content_calendars_created_by ON content_calendars(created_by);
CREATE INDEX IF NOT EXISTS idx_content_calendars_date_range ON content_calendars(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_content_calendars_platform ON content_calendars(platform);

CREATE INDEX IF NOT EXISTS idx_maya_prompts_created_by ON maya_prompt_suggestions(created_by);
CREATE INDEX IF NOT EXISTS idx_maya_prompts_category ON maya_prompt_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_maya_prompts_season ON maya_prompt_suggestions(season);
CREATE INDEX IF NOT EXISTS idx_maya_prompts_style ON maya_prompt_suggestions(style);

