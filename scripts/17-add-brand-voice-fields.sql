-- Add new fields to user_personal_brand table for voice, vibe, and content strategy

ALTER TABLE user_personal_brand
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS brand_voice TEXT,
ADD COLUMN IF NOT EXISTS language_style TEXT,
ADD COLUMN IF NOT EXISTS content_themes TEXT,
ADD COLUMN IF NOT EXISTS brand_vibe TEXT,
ADD COLUMN IF NOT EXISTS color_mood TEXT,
ADD COLUMN IF NOT EXISTS content_goals TEXT;

-- Update existing records to have empty strings instead of NULL
UPDATE user_personal_brand
SET 
  target_audience = COALESCE(target_audience, ''),
  brand_voice = COALESCE(brand_voice, ''),
  language_style = COALESCE(language_style, ''),
  content_themes = COALESCE(content_themes, ''),
  brand_vibe = COALESCE(brand_vibe, ''),
  color_mood = COALESCE(color_mood, ''),
  content_goals = COALESCE(content_goals, '');
