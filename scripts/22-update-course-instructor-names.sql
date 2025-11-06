-- Update instructor names for all courses
-- This fixes any courses that were created with the incorrect instructor name

-- Update any courses with the old incorrect name to the correct name
UPDATE academy_courses
SET 
  instructor_name = 'Sandra Sigurjonsdottir',
  updated_at = NOW()
WHERE 
  instructor_name = 'Sandra Sævarsdóttir' 
  OR instructor_name LIKE '%Sævarsdóttir%'
  OR instructor_name LIKE '%Saevarsdottir%';

-- Also update any courses that might have NULL or empty instructor names
UPDATE academy_courses
SET 
  instructor_name = 'Sandra Sigurjonsdottir',
  updated_at = NOW()
WHERE 
  instructor_name IS NULL 
  OR instructor_name = '';

-- Verify the update
SELECT id, title, instructor_name, updated_at
FROM academy_courses
ORDER BY created_at DESC;
