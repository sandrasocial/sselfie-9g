-- Maya is the app: persistent ownership layer
-- Adds canonical page storage and produced-assets catalog.

CREATE TABLE IF NOT EXISTS personal_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_slug TEXT NOT NULL,
  slug TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'landing',
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  page_jsonb JSONB DEFAULT '{}'::jsonb,
  published_html TEXT,
  preview_url TEXT,
  live_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slug),
  UNIQUE(owner_slug, slug)
);

CREATE TABLE IF NOT EXISTS maya_produced_assets (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  preview_image_url TEXT,
  source_chat_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_pages_user_id ON personal_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_pages_owner_slug ON personal_pages(owner_slug);
CREATE INDEX IF NOT EXISTS idx_maya_produced_assets_user_id ON maya_produced_assets(user_id);
