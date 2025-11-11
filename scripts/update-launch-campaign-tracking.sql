-- Update the tracking table to support broadcast IDs
ALTER TABLE launch_campaign_sends 
ADD COLUMN IF NOT EXISTS broadcast_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_launch_campaign_broadcast 
ON launch_campaign_sends(broadcast_id);
