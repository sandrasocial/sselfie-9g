CREATE TABLE IF NOT EXISTS deliverability_alert_claims (
  alert_id TEXT PRIMARY KEY,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
