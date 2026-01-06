-- Admin Email Errors Table
-- Stores error logs from Alex email tools for debugging and monitoring

CREATE TABLE IF NOT EXISTS admin_email_errors (
  id SERIAL PRIMARY KEY,
  tool_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_email_errors_tool_name ON admin_email_errors(tool_name);
CREATE INDEX IF NOT EXISTS idx_admin_email_errors_created_at ON admin_email_errors(created_at DESC);

COMMENT ON TABLE admin_email_errors IS 'Error logs from Alex email tools for debugging and monitoring';

