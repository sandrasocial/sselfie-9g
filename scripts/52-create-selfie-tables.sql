-- Create Selfie Tables
-- This script creates the selfie-related tables with is_public field included

-- Main selfies table - stores selfie images
CREATE TABLE IF NOT EXISTS selfies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Selfie versions table - stores different versions/variations of a selfie
CREATE TABLE IF NOT EXISTS selfie_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selfie_id UUID REFERENCES selfies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  version_number INTEGER DEFAULT 1,
  prompt TEXT,
  negative_prompt TEXT,
  model_version TEXT,
  replicate_prediction_id TEXT,
  seed INTEGER,
  guidance_scale DECIMAL(4,2),
  num_inference_steps INTEGER,
  width INTEGER,
  height INTEGER,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Selfie versions metadata table - stores additional metadata about versions
CREATE TABLE IF NOT EXISTS selfie_versions_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selfie_version_id UUID REFERENCES selfie_versions(id) ON DELETE CASCADE,
  metadata_type TEXT NOT NULL, -- 'style', 'tag', 'category', 'aesthetic', etc.
  metadata_key TEXT NOT NULL,
  metadata_value TEXT,
  metadata_json JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(selfie_version_id, metadata_type, metadata_key)
);

-- Selfie versions metadata audit table - tracks changes to metadata
CREATE TABLE IF NOT EXISTS selfie_versions_metadata_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metadata_id UUID REFERENCES selfie_versions_metadata(id) ON DELETE CASCADE,
  selfie_version_id UUID REFERENCES selfie_versions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_value TEXT,
  new_value TEXT,
  old_json JSONB,
  new_json JSONB,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_selfies_user_id ON selfies(user_id);
CREATE INDEX IF NOT EXISTS idx_selfies_is_public ON selfies(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_selfies_created_at ON selfies(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_selfie_versions_selfie_id ON selfie_versions(selfie_id);
CREATE INDEX IF NOT EXISTS idx_selfie_versions_user_id ON selfie_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_selfie_versions_is_public ON selfie_versions(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_selfie_versions_created_at ON selfie_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_version_id ON selfie_versions_metadata(selfie_version_id);
CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_type ON selfie_versions_metadata(metadata_type);
CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_is_public ON selfie_versions_metadata(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_metadata_id ON selfie_versions_metadata_audit(metadata_id);
CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_version_id ON selfie_versions_metadata_audit(selfie_version_id);
CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_action ON selfie_versions_metadata_audit(action);
CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_is_public ON selfie_versions_metadata_audit(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_selfie_versions_metadata_audit_created_at ON selfie_versions_metadata_audit(created_at DESC);

-- Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER selfies_updated_at
BEFORE UPDATE ON selfies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER selfie_versions_updated_at
BEFORE UPDATE ON selfie_versions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER selfie_versions_metadata_updated_at
BEFORE UPDATE ON selfie_versions_metadata
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
