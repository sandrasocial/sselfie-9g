-- Create prompt_audit_events table for monitoring prompt generation health
-- Phase 5A: Prompt Health Dashboard

CREATE TABLE IF NOT EXISTS prompt_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  route_id TEXT NOT NULL,
  route_path TEXT,
  prompt_type TEXT,
  fingerprint TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  error_code TEXT,
  request_id TEXT,
  user_id TEXT,
  mode TEXT,
  feature TEXT,
  builder TEXT,
  execution_time_ms INTEGER,
  prompt_length INTEGER,
  input_hash TEXT,
  output_hash TEXT,
  path_used TEXT CHECK (path_used IN ('authority', 'legacy'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_prompt_audit_created_at ON prompt_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_route_id ON prompt_audit_events(route_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_status ON prompt_audit_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_fingerprint ON prompt_audit_events(fingerprint, created_at DESC);

-- Comments
COMMENT ON TABLE prompt_audit_events IS 'Tracks all prompt generation events for health monitoring and drift detection';
COMMENT ON COLUMN prompt_audit_events.route_id IS 'Entry point identifier (e.g., EP-01, EP-03)';
COMMENT ON COLUMN prompt_audit_events.fingerprint IS 'SHA-256 hash fingerprint of prompt (first 16 chars) for drift detection';
COMMENT ON COLUMN prompt_audit_events.status IS 'ok = successful generation, error = failed generation';
