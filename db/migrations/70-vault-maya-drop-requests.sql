-- Vault Maya: subscriber requests for what Sandra should create in the next drop.
CREATE TABLE IF NOT EXISTS vault_maya_drop_requests (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  inspo_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | seen | planned | shipped
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_maya_drop_requests_status
  ON vault_maya_drop_requests (status, created_at DESC);
