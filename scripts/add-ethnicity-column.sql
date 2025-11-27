-- Add ethnicity column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ethnicity VARCHAR(100);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_ethnicity ON users(ethnicity);

-- Add comment explaining the column
COMMENT ON COLUMN users.ethnicity IS 'User ethnicity for accurate AI image representation. Values: Black, White, Asian, Latina, Middle Eastern, Indigenous, Mixed, Other, or NULL if not specified.';
