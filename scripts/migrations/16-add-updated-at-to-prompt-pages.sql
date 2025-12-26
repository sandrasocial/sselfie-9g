-- Add updated_at column to prompt_pages table
-- This column is required for the update_prompt_guide tool to track when pages are modified

ALTER TABLE prompt_pages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to set updated_at to created_at if it's null
UPDATE prompt_pages 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add a trigger to automatically update updated_at on row updates (optional but recommended)
CREATE OR REPLACE FUNCTION update_prompt_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS trigger_update_prompt_pages_updated_at ON prompt_pages;
CREATE TRIGGER trigger_update_prompt_pages_updated_at
  BEFORE UPDATE ON prompt_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_pages_updated_at();


