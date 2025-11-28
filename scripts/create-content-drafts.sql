-- Create content_drafts table for storing AI-generated content drafts
CREATE TABLE IF NOT EXISTS content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for type lookups
CREATE INDEX IF NOT EXISTS idx_content_drafts_type ON content_drafts(type);

-- Create index for created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_content_drafts_created_at ON content_drafts(created_at DESC);

-- Removed RLS policies (not compatible with Neon/standard PostgreSQL)
