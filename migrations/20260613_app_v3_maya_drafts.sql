-- APP-V3-STATE-01 - account-backed active Maya workspace.
-- Stores the latest active /app concierge draft so refresh, new tabs, and another
-- browser on the same account can resume without replaying generation.

CREATE TABLE IF NOT EXISTS app_v3_maya_drafts (
  user_id    text PRIMARY KEY,
  chat_id    text NOT NULL,
  snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_app_v3_maya_drafts_updated
  ON app_v3_maya_drafts (updated_at DESC)
  WHERE cleared_at IS NULL;
