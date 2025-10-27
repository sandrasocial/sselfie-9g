-- Add auth_id column to users table to link Supabase Auth users
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add comment
COMMENT ON COLUMN users.auth_id IS 'Supabase Auth user ID for authentication linking';
