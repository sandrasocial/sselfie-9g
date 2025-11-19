-- Add additional image columns for testimonial carousel support
ALTER TABLE admin_testimonials 
ADD COLUMN IF NOT EXISTS image_url_2 TEXT,
ADD COLUMN IF NOT EXISTS image_url_3 TEXT,
ADD COLUMN IF NOT EXISTS image_url_4 TEXT;

-- Add index for faster image queries
CREATE INDEX IF NOT EXISTS idx_testimonials_with_images ON admin_testimonials(id) 
WHERE screenshot_url IS NOT NULL OR image_url_2 IS NOT NULL OR image_url_3 IS NOT NULL OR image_url_4 IS NOT NULL;
