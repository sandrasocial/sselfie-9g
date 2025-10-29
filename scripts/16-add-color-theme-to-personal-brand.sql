-- Add color_theme column to user_personal_brand table
ALTER TABLE user_personal_brand 
ADD COLUMN IF NOT EXISTS color_theme TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN user_personal_brand.color_theme IS 'User selected color theme/aesthetic: dark-moody, minimalist-clean, beige-creamy, pastel-coastal, warm-terracotta, bold-colorful';
