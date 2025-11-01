-- Add duration_seconds column to academy_lessons table
-- This replaces duration_minutes for more precise video duration tracking

ALTER TABLE academy_lessons
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- Migrate existing data from duration_minutes to duration_seconds (if any exists)
UPDATE academy_lessons 
SET duration_seconds = COALESCE(duration_minutes, 0) * 60 
WHERE duration_seconds = 0 AND duration_minutes IS NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_academy_lessons_duration_seconds ON academy_lessons(duration_seconds);

-- Note: We're keeping duration_minutes for backward compatibility
-- but all new code should use duration_seconds
