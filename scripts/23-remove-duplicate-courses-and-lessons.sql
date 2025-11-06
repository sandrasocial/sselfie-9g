-- Remove duplicate courses and lessons that have no content
-- This script identifies and removes duplicates, keeping the ones with actual content

-- Step 1: Remove duplicate "Branded by SSELFIE" courses
-- Keep the course with the most lessons (the one with actual content)
DELETE FROM academy_courses
WHERE title = 'BRANDED BY SSELFIE'
AND id NOT IN (
  SELECT id FROM academy_courses
  WHERE title = 'BRANDED BY SSELFIE'
  ORDER BY total_lessons DESC, duration_minutes DESC
  LIMIT 1
);

-- Step 2: Remove duplicate lessons with no content
-- For lessons with the same title and course_id, keep the one with duration > 0
DELETE FROM academy_lessons
WHERE id IN (
  SELECT l1.id
  FROM academy_lessons l1
  INNER JOIN academy_lessons l2 
    ON l1.course_id = l2.course_id 
    AND l1.title = l2.title 
    AND l1.id != l2.id
  WHERE l1.duration_minutes = 0 
    AND l2.duration_minutes > 0
);

-- Step 3: Remove any lessons with 0 duration that don't have a duplicate with content
-- (These are lessons that were created but never filled with content)
DELETE FROM academy_lessons
WHERE duration_minutes = 0
AND video_url IS NULL
AND description IS NULL;

-- Step 4: Update course total_lessons count to match actual lesson count
UPDATE academy_courses
SET total_lessons = (
  SELECT COUNT(*) 
  FROM academy_lessons 
  WHERE academy_lessons.course_id = academy_courses.id
);

-- Step 5: Update course duration to match sum of lesson durations
UPDATE academy_courses
SET duration_minutes = (
  SELECT COALESCE(SUM(duration_minutes), 0)
  FROM academy_lessons 
  WHERE academy_lessons.course_id = academy_courses.id
);

-- Verification queries (uncomment to check results)
-- SELECT id, title, total_lessons, duration_minutes FROM academy_courses;
-- SELECT id, title, course_id, duration_minutes FROM academy_lessons ORDER BY course_id, order_index;
