-- Add password_setup_complete flag to track if users have chosen their password
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_setup_complete BOOLEAN DEFAULT FALSE;

-- Update existing users who likely have set up their passwords (those with custom display names)
UPDATE users 
SET password_setup_complete = TRUE
WHERE display_name IS NOT NULL 
  AND display_name != SPLIT_PART(email, '@', 1);

-- Verify the changes
SELECT 
  email, 
  display_name, 
  password_setup_complete,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
