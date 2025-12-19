-- Add is_public field to selfie-related tables
-- This migration adds the is_public boolean field to:
-- - selfies
-- - selfie_versions
-- - selfie_versions_metadata
-- - selfie_versions_metadata_audit

-- Add is_public to selfies table
ALTER TABLE selfies
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add is_public to selfie_versions table
ALTER TABLE selfie_versions
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add is_public to selfie_versions_metadata table
ALTER TABLE selfie_versions_metadata
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add is_public to selfie_versions_metadata_audit table
ALTER TABLE selfie_versions_metadata_audit
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create indexes for better query performance on is_public field
CREATE INDEX IF NOT EXISTS idx_selfies_is_public ON selfies(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_selfie_versions_is_public ON selfie_versions(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_is_public ON selfie_versions_metadata(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_is_public ON selfie_versions_metadata_audit(is_public) WHERE is_public = true;
