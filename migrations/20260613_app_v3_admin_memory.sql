CREATE TABLE IF NOT EXISTS app_v3_admin_memory (
  id             bigserial PRIMARY KEY,
  admin_user_id  text,
  kind           text NOT NULL,
  source_type    text NOT NULL DEFAULT 'manual',
  source_id      text,
  source_title   text,
  note           text NOT NULL,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_v3_admin_memory_created_at
  ON app_v3_admin_memory (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_v3_admin_memory_kind
  ON app_v3_admin_memory (kind, created_at DESC);
