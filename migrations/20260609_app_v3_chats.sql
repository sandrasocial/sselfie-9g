-- MAYA-REBUILD-05 Phase C — Studio 3.0 /app chat persistence.
-- Isolated, additive table for the new /app concierge. Schema carries user_id so it is
-- member-ready from day one; the UI/routing stays admin-gated for now. No legacy table touched.
-- The app also creates this lazily (CREATE TABLE IF NOT EXISTS) so the preview works without
-- a manual apply; this file is the canonical record and the formal apply for production.

CREATE TABLE IF NOT EXISTS app_v3_chats (
  id          text PRIMARY KEY,
  user_id     text NOT NULL,
  title       text,
  messages    jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_app_v3_chats_user
  ON app_v3_chats (user_id, updated_at DESC)
  WHERE archived_at IS NULL;
