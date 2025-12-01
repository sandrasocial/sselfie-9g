-- Create pipeline_runs table for tracking pipeline execution history
-- This table stores execution results, steps, and metadata for observability

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id VARCHAR(255) PRIMARY KEY,
  pipeline VARCHAR(255) NOT NULL,
  ok BOOLEAN NOT NULL,
  steps JSONB NOT NULL,
  result JSONB NOT NULL,
  duration_ms INTEGER,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for querying recent runs
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON pipeline_runs(started_at DESC);

-- Index for querying by pipeline name
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pipeline ON pipeline_runs(pipeline);

-- Index for querying by success status
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_ok ON pipeline_runs(ok);

