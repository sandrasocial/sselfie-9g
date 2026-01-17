-- Create incident_events table for tracking incidents and safe mode events
-- Phase 6A: Safe Mode + Incident Log

CREATE TABLE IF NOT EXISTS incident_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('red', 'orange', 'yellow')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  snapshot JSONB,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  dedupe_key TEXT -- For deduplication (fingerprint/route/provider combination)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_incident_events_created_at ON incident_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_events_severity ON incident_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_events_resolved_at ON incident_events(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_events_dedupe_key ON incident_events(dedupe_key, created_at DESC);

-- Comments
COMMENT ON TABLE incident_events IS 'Tracks incidents and safe mode events for monitoring and resolution';
COMMENT ON COLUMN incident_events.severity IS 'Alert severity: red (critical), orange (elevated), yellow (informational)';
COMMENT ON COLUMN incident_events.snapshot IS 'JSON snapshot of metrics/context at time of incident';
COMMENT ON COLUMN incident_events.dedupe_key IS 'Key for deduplication (route_id + fingerprint + provider combination)';
