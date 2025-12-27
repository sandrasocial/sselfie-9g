-- Add Loops contact tracking to freebie_subscribers
ALTER TABLE freebie_subscribers
ADD COLUMN IF NOT EXISTS loops_contact_id VARCHAR(255);

ALTER TABLE freebie_subscribers
ADD COLUMN IF NOT EXISTS synced_to_loops BOOLEAN DEFAULT false;

ALTER TABLE freebie_subscribers
ADD COLUMN IF NOT EXISTS loops_synced_at TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_freebie_loops_contact
ON freebie_subscribers(loops_contact_id);

CREATE INDEX IF NOT EXISTS idx_freebie_loops_synced
ON freebie_subscribers(synced_to_loops) WHERE synced_to_loops = false;

-- Add Loops contact tracking to blueprint_subscribers
ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS loops_contact_id VARCHAR(255);

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS synced_to_loops BOOLEAN DEFAULT false;

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS loops_synced_at TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_blueprint_loops_contact
ON blueprint_subscribers(loops_contact_id);

CREATE INDEX IF NOT EXISTS idx_blueprint_loops_synced
ON blueprint_subscribers(synced_to_loops) WHERE synced_to_loops = false;

-- Add comments for documentation
COMMENT ON COLUMN freebie_subscribers.loops_contact_id IS 'Loops platform contact ID for marketing emails';
COMMENT ON COLUMN freebie_subscribers.synced_to_loops IS 'Whether contact has been synced to Loops';
COMMENT ON COLUMN freebie_subscribers.loops_synced_at IS 'Timestamp when contact was synced to Loops';

COMMENT ON COLUMN blueprint_subscribers.loops_contact_id IS 'Loops platform contact ID for marketing emails';
COMMENT ON COLUMN blueprint_subscribers.synced_to_loops IS 'Whether contact has been synced to Loops';
COMMENT ON COLUMN blueprint_subscribers.loops_synced_at IS 'Timestamp when contact was synced to Loops';

