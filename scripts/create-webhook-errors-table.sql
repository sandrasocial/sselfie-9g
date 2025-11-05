-- Create webhook_errors table for monitoring and alerting
CREATE TABLE IF NOT EXISTS webhook_errors (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255)
);

-- Index for querying recent errors
CREATE INDEX IF NOT EXISTS idx_webhook_errors_created_at ON webhook_errors(created_at DESC);

-- Index for querying unresolved errors
CREATE INDEX IF NOT EXISTS idx_webhook_errors_resolved ON webhook_errors(resolved) WHERE resolved = FALSE;

-- Index for querying by event type
CREATE INDEX IF NOT EXISTS idx_webhook_errors_event_type ON webhook_errors(event_type);
