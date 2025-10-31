-- Add new fields to user_personal_brand table for enhanced brand understanding

BEGIN;

-- Add visual aesthetic field
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS visual_aesthetic TEXT;

-- Add visual aesthetic settings preference
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS settings_preference TEXT;

-- Add fashion style preference
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS fashion_style TEXT;

-- Add ideal audience description
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS ideal_audience TEXT;

-- Add audience challenge
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS audience_challenge TEXT;

-- Add audience transformation
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS audience_transformation TEXT;

-- Add brand voice/tone
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS communication_voice TEXT;

-- Add specific phrases/language
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS signature_phrases TEXT;

-- Add brand inspiration (creators/brands they admire)
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS brand_inspiration TEXT;

-- Add example content links
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS inspiration_links TEXT;

COMMIT;

-- Verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_personal_brand' 
AND column_name IN (
  'visual_aesthetic', 
  'settings_preference', 
  'fashion_style',
  'ideal_audience',
  'audience_challenge',
  'audience_transformation',
  'communication_voice',
  'signature_phrases',
  'brand_inspiration',
  'inspiration_links'
)
ORDER BY column_name;
