-- Add missing columns to alex_suggestion_history table
-- These columns are used to track if suggestions were acted upon

ALTER TABLE alex_suggestion_history
ADD COLUMN IF NOT EXISTS acted_upon BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS acted_upon_at TIMESTAMPTZ;

-- Add index for acted_upon queries
CREATE INDEX IF NOT EXISTS idx_alex_suggestion_acted_upon ON alex_suggestion_history(acted_upon, acted_upon_at);

-- Comments
COMMENT ON COLUMN alex_suggestion_history.acted_upon IS 'Whether the user acted on this suggestion (e.g., created the email, set up the automation)';
COMMENT ON COLUMN alex_suggestion_history.acted_upon_at IS 'Timestamp when the user acted on this suggestion';










