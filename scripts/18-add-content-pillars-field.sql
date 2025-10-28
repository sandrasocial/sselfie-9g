-- Fixed table name from personal_brand to user_personal_brand
-- Add content_pillars field to user_personal_brand table
ALTER TABLE user_personal_brand
ADD COLUMN IF NOT EXISTS content_pillars TEXT;

-- Add comment
COMMENT ON COLUMN user_personal_brand.content_pillars IS 'JSON array of content pillars with name, description, and content ideas';
