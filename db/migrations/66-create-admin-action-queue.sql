CREATE TABLE IF NOT EXISTS admin_action_queue (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('send_ig_reply', 'send_resend_broadcast')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'executing', 'completed', 'dismissed', 'failed')),
  expires_at TIMESTAMPTZ NOT NULL,
  acted_at TIMESTAMPTZ,
  review_note TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_queue_pending
  ON admin_action_queue (status, created_at DESC)
  WHERE status = 'pending';

COMMENT ON TABLE admin_action_queue IS
  'Durable, single-use Sandra approvals. Email links only open a confirmation page, and POST performs the action.';
