-- Remove tier column from academy_courses table
-- All courses are now available to Studio Membership users

ALTER TABLE academy_courses DROP COLUMN IF EXISTS tier;

-- Add comment to document the change
COMMENT ON TABLE academy_courses IS 'Academy courses - all courses available to Studio Membership users';
