-- Admin Cron Runs Tracking Table
-- Tracks execution history of all cron jobs for monitoring and debugging

CREATE TABLE IF NOT EXISTS admin_cron_runs (
  id SERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  summary JSONB DEFAULT '{}',
  error_id INTEGER REFERENCES admin_email_errors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_cron_runs_job_name ON admin_cron_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_admin_cron_runs_started_at ON admin_cron_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_cron_runs_status ON admin_cron_runs(status);
CREATE INDEX IF NOT EXISTS idx_admin_cron_runs_error_id ON admin_cron_runs(error_id);

COMMENT ON TABLE admin_cron_runs IS 'Tracks execution history of cron jobs for monitoring and debugging';

