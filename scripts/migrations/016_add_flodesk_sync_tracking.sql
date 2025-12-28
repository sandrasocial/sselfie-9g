-- Add Flodesk sync tracking to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS flodesk_subscriber_id TEXT,
ADD COLUMN IF NOT EXISTS synced_to_flodesk BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flodesk_synced_at TIMESTAMPTZ;

-- Add index for Flodesk sync queries
CREATE INDEX IF NOT EXISTS idx_users_flodesk_sync 
ON users(synced_to_flodesk, flodesk_synced_at);

-- Add index for Flodesk subscriber ID lookups
CREATE INDEX IF NOT EXISTS idx_users_flodesk_subscriber_id 
ON users(flodesk_subscriber_id) 
WHERE flodesk_subscriber_id IS NOT NULL;

-- Note: Verification query is run in the TypeScript migration script
-- to ensure columns exist before querying them
