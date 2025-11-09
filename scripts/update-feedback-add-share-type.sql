-- Add 'share_sselfies' to the feedback type constraint
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;

-- Adding share_sselfies to allowed feedback types
ALTER TABLE feedback ADD CONSTRAINT feedback_type_check 
  CHECK (type IN ('bug', 'feature', 'testimonial', 'general', 'share_sselfies'));
