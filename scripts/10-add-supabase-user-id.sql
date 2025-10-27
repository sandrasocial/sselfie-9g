-- Add supabase_user_id column to users table for new Supabase Auth users
-- Existing users will continue using stack_auth_id

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS supabase_user_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_supabase_user_id ON users(supabase_user_id);

-- Add comment to explain the dual auth system
COMMENT ON COLUMN users.supabase_user_id IS 'Supabase Auth user ID for new users (post-migration)';
COMMENT ON COLUMN users.stack_auth_id IS 'Stack Auth user ID for existing users (pre-migration)';
