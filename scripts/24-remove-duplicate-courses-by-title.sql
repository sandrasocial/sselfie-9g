-- Remove duplicate "Branded by SSELFIE" courses
-- Keep only the course with the most lessons (the one with actual content)

-- First, let's see what we have
DO $$
DECLARE
  course_to_keep INTEGER;
  courses_to_delete INTEGER[];
BEGIN
  -- Find the course with the most lessons (this is the one we want to keep)
  SELECT id INTO course_to_keep
  FROM academy_courses
  WHERE LOWER(title) LIKE '%branded%sselfie%'
  ORDER BY total_lessons DESC NULLS LAST, id ASC
  LIMIT 1;

  -- Find all other courses with similar titles
  SELECT ARRAY_AGG(id) INTO courses_to_delete
  FROM academy_courses
  WHERE LOWER(title) LIKE '%branded%sselfie%'
    AND id != course_to_keep;

  -- Log what we're doing
  RAISE NOTICE 'Keeping course ID: %', course_to_keep;
  RAISE NOTICE 'Deleting course IDs: %', courses_to_delete;

  -- Delete related data for duplicate courses
  IF courses_to_delete IS NOT NULL THEN
    -- Delete user enrollments for duplicate courses
    DELETE FROM user_academy_enrollments
    WHERE course_id = ANY(courses_to_delete);

    -- Delete lesson progress for lessons in duplicate courses
    DELETE FROM user_lesson_progress
    WHERE lesson_id IN (
      SELECT id FROM academy_lessons
      WHERE course_id = ANY(courses_to_delete)
    );

    -- Delete lessons for duplicate courses
    DELETE FROM academy_lessons
    WHERE course_id = ANY(courses_to_delete);

    -- Delete the duplicate courses
    DELETE FROM academy_courses
    WHERE id = ANY(courses_to_delete);

    RAISE NOTICE 'Cleanup complete!';
  ELSE
    RAISE NOTICE 'No duplicate courses found';
  END IF;
END $$;

-- Now remove any lessons with 0 duration that might be duplicates
DELETE FROM academy_lessons
WHERE duration_seconds = 0
  AND duration_minutes = 0
  AND id IN (
    SELECT l1.id
    FROM academy_lessons l1
    INNER JOIN academy_lessons l2 ON l1.course_id = l2.course_id
      AND l1.title = l2.title
      AND l1.id != l2.id
      AND l2.duration_seconds > 0
  );

-- Update course metadata to reflect correct counts
UPDATE academy_courses c
SET 
  total_lessons = (
    SELECT COUNT(*)
    FROM academy_lessons l
    WHERE l.course_id = c.id
  ),
  duration_minutes = (
    SELECT COALESCE(SUM(duration_minutes), 0)
    FROM academy_lessons l
    WHERE l.course_id = c.id
  ),
  updated_at = NOW();
