-- Cron Job Logging System
-- Provides centralized logging for all cron job executions
-- Tracks success, failures, execution times, and error details

CREATE TABLE IF NOT EXISTS cron_job_logs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'started', 'success', 'failed', 'timeout'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER, -- Execution time in milliseconds
  execution_count INTEGER DEFAULT 0, -- Total times this job has run
  last_run_at TIMESTAMPTZ,
  last_status VARCHAR(50),
  last_error TEXT,
  error_message TEXT, -- Current run error message
  error_stack TEXT, -- Current run error stack trace
  metadata JSONB DEFAULT '{}', -- Additional data (recipients sent, items processed, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON cron_job_logs(status);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_started_at ON cron_job_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_status ON cron_job_logs(job_name, status);

-- Summary table for quick dashboard views
CREATE TABLE IF NOT EXISTS cron_job_summary (
  job_name VARCHAR(255) PRIMARY KEY,
  total_executions INTEGER DEFAULT 0,
  total_successes INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_status VARCHAR(50),
  last_duration_ms INTEGER,
  last_error TEXT,
  average_duration_ms INTEGER,
  success_rate NUMERIC(5,2), -- Percentage (0.00 to 100.00)
  next_expected_run TIMESTAMPTZ, -- For scheduled jobs
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_cron_job_summary_last_run ON cron_job_summary(last_run_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_summary_status ON cron_job_summary(last_status);

-- Function to update summary table after each job run
CREATE OR REPLACE FUNCTION update_cron_job_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update summary when job completes
  IF NEW.completed_at IS NOT NULL THEN
    INSERT INTO cron_job_summary (
      job_name,
      total_executions,
      total_successes,
      total_failures,
      last_run_at,
      last_status,
      last_duration_ms,
      last_error,
      average_duration_ms,
      success_rate,
      updated_at
    )
    SELECT
      NEW.job_name,
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'success'),
      COUNT(*) FILTER (WHERE status = 'failed'),
      NEW.completed_at,
      NEW.status,
      NEW.duration_ms,
      NEW.error_message,
      AVG(duration_ms)::INTEGER,
      ROUND((COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / COUNT(*)) * 100, 2),
      NOW()
    FROM cron_job_logs
    WHERE job_name = NEW.job_name
    GROUP BY job_name
    ON CONFLICT (job_name)
    DO UPDATE SET
      total_executions = EXCLUDED.total_executions,
      total_successes = EXCLUDED.total_successes,
      total_failures = EXCLUDED.total_failures,
      last_run_at = EXCLUDED.last_run_at,
      last_status = EXCLUDED.last_status,
      last_duration_ms = EXCLUDED.last_duration_ms,
      last_error = EXCLUDED.last_error,
      average_duration_ms = EXCLUDED.average_duration_ms,
      success_rate = EXCLUDED.success_rate,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update summary
DROP TRIGGER IF EXISTS update_cron_summary ON cron_job_logs;
CREATE TRIGGER update_cron_summary
  AFTER INSERT OR UPDATE ON cron_job_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_cron_job_summary();

-- Comments for documentation
COMMENT ON TABLE cron_job_logs IS 'Detailed log of every cron job execution';
COMMENT ON TABLE cron_job_summary IS 'Summary statistics for each cron job (auto-updated)';
COMMENT ON COLUMN cron_job_logs.job_name IS 'Name of the cron job (e.g., "welcome-sequence", "send-scheduled-campaigns")';
COMMENT ON COLUMN cron_job_logs.status IS 'Execution status: started, success, failed, timeout';
COMMENT ON COLUMN cron_job_logs.duration_ms IS 'How long the job took to complete (milliseconds)';
COMMENT ON COLUMN cron_job_logs.metadata IS 'Job-specific data like { emailsSent: 150, emailsFailed: 2 }';
COMMENT ON COLUMN cron_job_summary.success_rate IS 'Percentage of successful runs (0.00 to 100.00)';

-- View for recent failures (helpful for monitoring)
CREATE OR REPLACE VIEW cron_job_recent_failures AS
SELECT 
  job_name,
  status,
  started_at,
  completed_at,
  duration_ms,
  error_message,
  metadata
FROM cron_job_logs
WHERE status = 'failed'
  AND started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;

-- View for job health dashboard
CREATE OR REPLACE VIEW cron_job_health_dashboard AS
SELECT 
  s.job_name,
  s.total_executions,
  s.success_rate,
  s.last_run_at,
  s.last_status,
  s.last_duration_ms,
  s.average_duration_ms,
  s.is_enabled,
  CASE 
    WHEN s.last_status = 'failed' THEN '❌'
    WHEN s.last_status = 'success' AND s.success_rate >= 95 THEN '✅'
    WHEN s.last_status = 'success' AND s.success_rate >= 80 THEN '⚠️'
    ELSE '🔴'
  END as health_status,
  CASE
    WHEN s.last_run_at < NOW() - INTERVAL '2 hours' THEN 'Stale'
    WHEN s.last_status = 'failed' THEN 'Failed'
    WHEN s.success_rate < 80 THEN 'Unhealthy'
    ELSE 'Healthy'
  END as status_text
FROM cron_job_summary s
ORDER BY 
  CASE 
    WHEN s.last_status = 'failed' THEN 1
    WHEN s.success_rate < 80 THEN 2
    ELSE 3
  END,
  s.last_run_at DESC;

COMMENT ON VIEW cron_job_health_dashboard IS 'Quick health overview of all cron jobs for admin dashboard';
