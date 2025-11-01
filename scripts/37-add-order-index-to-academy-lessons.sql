-- Add order_index column to academy_lessons table
-- This allows for flexible ordering of lessons within a course

ALTER TABLE academy_lessons 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Migrate existing lesson_number values to order_index
-- This preserves the existing lesson order
UPDATE academy_lessons 
SET order_index = lesson_number - 1
WHERE order_index = 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_academy_lessons_order_index ON academy_lessons(order_index);

-- Update the comment to clarify both fields
COMMENT ON COLUMN academy_lessons.lesson_number IS 'Display number shown to users (1, 2, 3...)';
COMMENT ON COLUMN academy_lessons.order_index IS 'Internal ordering index (0, 1, 2...) for sorting';
