-- Comprehensive Alex Tables Migration
-- This ensures all tables needed by Alex are created

-- ============================================
-- 1. Alex Suggestion History
-- ============================================
CREATE TABLE IF NOT EXISTS alex_suggestion_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  suggestion_type VARCHAR(100) NOT NULL,
  suggestion_text TEXT,
  reasoning TEXT,
  priority INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  acted_upon BOOLEAN DEFAULT FALSE,
  acted_upon_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alex_suggestion_user_type ON alex_suggestion_history(user_id, suggestion_type);
CREATE INDEX IF NOT EXISTS idx_alex_suggestion_dismissed_at ON alex_suggestion_history(dismissed_at);
CREATE INDEX IF NOT EXISTS idx_alex_suggestion_acted_upon ON alex_suggestion_history(acted_upon, acted_upon_at);
CREATE INDEX IF NOT EXISTS idx_alex_suggestion_created_at ON alex_suggestion_history(created_at DESC);

-- ============================================
-- 2. Testimonials
-- ============================================
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  testimonial_text TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  screenshot_url TEXT,
  image_url_2 TEXT,
  image_url_3 TEXT,
  image_url_4 TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(is_featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(is_published);
CREATE INDEX IF NOT EXISTS idx_testimonials_rating ON testimonials(rating);
CREATE INDEX IF NOT EXISTS idx_testimonials_collected_at ON testimonials(collected_at DESC);

-- ============================================
-- 3. Maya Prompt Suggestions
-- ============================================
CREATE TABLE IF NOT EXISTS maya_prompt_suggestions (
  id SERIAL PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  prompt_title VARCHAR(255),
  category VARCHAR(100),
  season VARCHAR(50),
  style VARCHAR(100),
  mood VARCHAR(100),
  tags TEXT[],
  use_case TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maya_prompts_created_by ON maya_prompt_suggestions(created_by);
CREATE INDEX IF NOT EXISTS idx_maya_prompts_category ON maya_prompt_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_maya_prompts_season ON maya_prompt_suggestions(season);
CREATE INDEX IF NOT EXISTS idx_maya_prompts_style ON maya_prompt_suggestions(style);
CREATE INDEX IF NOT EXISTS idx_maya_prompts_created_at ON maya_prompt_suggestions(created_at DESC);

-- ============================================
-- 4. Content Calendars
-- ============================================
CREATE TABLE IF NOT EXISTS content_calendars (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  platform VARCHAR(50),
  calendar_data JSONB NOT NULL,
  content_pillars TEXT[],
  total_posts INTEGER,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_calendars_created_by ON content_calendars(created_by);
CREATE INDEX IF NOT EXISTS idx_content_calendars_date_range ON content_calendars(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_content_calendars_platform ON content_calendars(platform);
CREATE INDEX IF NOT EXISTS idx_content_calendars_created_at ON content_calendars(created_at DESC);

-- ============================================
-- 5. Instagram Captions
-- ============================================
CREATE TABLE IF NOT EXISTS instagram_captions (
  id SERIAL PRIMARY KEY,
  caption_text TEXT NOT NULL,
  caption_type VARCHAR(50),
  hashtags TEXT[],
  cta TEXT,
  image_description TEXT,
  tone VARCHAR(50),
  word_count INTEGER,
  hook TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_captions_created_by ON instagram_captions(created_by);
CREATE INDEX IF NOT EXISTS idx_instagram_captions_created_at ON instagram_captions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_captions_type ON instagram_captions(caption_type);

-- ============================================
-- 6. Email Template Library
-- ============================================
CREATE TABLE IF NOT EXISTS email_template_library (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,
  tags JSONB,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_template_library_category ON email_template_library(category);
CREATE INDEX IF NOT EXISTS idx_email_template_library_active ON email_template_library(is_active);

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE alex_suggestion_history IS 'Tracks when users dismiss proactive suggestions from Alex to prevent showing the same suggestion too frequently';
COMMENT ON COLUMN alex_suggestion_history.acted_upon IS 'Whether the user acted on this suggestion (e.g., created the email, set up the automation)';
COMMENT ON COLUMN alex_suggestion_history.acted_upon_at IS 'Timestamp when the user acted on this suggestion';
COMMENT ON TABLE testimonials IS 'Customer testimonials for display on website and use in email campaigns';
COMMENT ON TABLE maya_prompt_suggestions IS 'AI-generated prompt suggestions for Maya photo generation';
COMMENT ON TABLE content_calendars IS 'Content calendars created by Alex for planning social media and email content';
COMMENT ON TABLE instagram_captions IS 'Instagram captions generated by Alex';
COMMENT ON TABLE email_template_library IS 'Pre-built email templates for Alex to use when generating email content';









