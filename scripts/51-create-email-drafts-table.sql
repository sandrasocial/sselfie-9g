-- Email Drafts Table - Persistent storage for email drafts (similar to concept_cards)
-- Allows saving, versioning, and editing emails without losing previous versions

CREATE TABLE IF NOT EXISTS admin_email_drafts (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER, -- Optional: link to admin chat session
  draft_name TEXT NOT NULL, -- User-friendly name (e.g., "Weekly Newsletter - Jan 2025")
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT, -- Plain text version
  email_type TEXT DEFAULT 'newsletter', -- 'newsletter', 'promotional', 'welcome', etc.
  campaign_name TEXT, -- Optional campaign name
  target_segment TEXT, -- Target audience segment
  image_urls TEXT[], -- Array of image URLs used
  metadata JSONB DEFAULT '{}', -- Additional metadata (tone, key points, etc.)
  version_number INTEGER DEFAULT 1, -- Version number (increments on edits)
  parent_draft_id INTEGER REFERENCES admin_email_drafts(id) ON DELETE SET NULL, -- Links to previous version
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'sent', 'archived'
  is_current_version BOOLEAN DEFAULT true, -- Latest version flag
  created_by TEXT DEFAULT 'ssa@ssasocial.com',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_drafts_chat_id ON admin_email_drafts(chat_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON admin_email_drafts(status);
CREATE INDEX IF NOT EXISTS idx_email_drafts_created_at ON admin_email_drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_drafts_parent_id ON admin_email_drafts(parent_draft_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_current_version ON admin_email_drafts(is_current_version) WHERE is_current_version = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER email_drafts_updated_at
BEFORE UPDATE ON admin_email_drafts
FOR EACH ROW
EXECUTE FUNCTION update_email_drafts_updated_at();

-- Comments
COMMENT ON TABLE admin_email_drafts IS 'Stores email drafts with version history, similar to concept cards. Allows editing without losing previous versions.';
COMMENT ON COLUMN admin_email_drafts.parent_draft_id IS 'Links to previous version for version history tracking';
COMMENT ON COLUMN admin_email_drafts.is_current_version IS 'True for the latest version of a draft. Previous versions are kept for history.';


