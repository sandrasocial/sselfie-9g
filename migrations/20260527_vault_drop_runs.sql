-- Vault drop run tracking table.
--
-- One row per triggered email drop (dry-run or live).
-- Counters are incremented by the /process endpoint as batches complete.
-- The email_logs table (via email_type = 'vault_drop_{drop_key}_{audience}')
-- is the idempotency record — this table is for progress visibility only.

CREATE TABLE IF NOT EXISTS vault_drop_runs (
  id                   TEXT        PRIMARY KEY,
  drop_key             TEXT        NOT NULL,        -- 'coastal-white+dark-balcony' (sorted slugs)
  collection_slugs     TEXT[]      NOT NULL,        -- ['coastal-white', 'dark-balcony']
  is_dry_run           BOOLEAN     NOT NULL DEFAULT TRUE,
  status               TEXT        NOT NULL DEFAULT 'pending',
    -- pending | processing | completed | partially_completed | failed

  non_buyer_total      INTEGER     NOT NULL DEFAULT 0,
  non_buyer_sent       INTEGER     NOT NULL DEFAULT 0,
  non_buyer_failed     INTEGER     NOT NULL DEFAULT 0,
  non_buyer_skipped    INTEGER     NOT NULL DEFAULT 0,

  buyer_total          INTEGER     NOT NULL DEFAULT 0,
  buyer_sent           INTEGER     NOT NULL DEFAULT 0,
  buyer_failed         INTEGER     NOT NULL DEFAULT 0,
  buyer_skipped        INTEGER     NOT NULL DEFAULT 0,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,

  notes                TEXT
);

CREATE INDEX IF NOT EXISTS vault_drop_runs_drop_key_idx ON vault_drop_runs(drop_key);
CREATE INDEX IF NOT EXISTS vault_drop_runs_status_idx   ON vault_drop_runs(status);
CREATE INDEX IF NOT EXISTS vault_drop_runs_created_at_idx ON vault_drop_runs(created_at DESC);
