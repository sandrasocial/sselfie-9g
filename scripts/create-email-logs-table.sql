-- Create email logs table for tracking email delivery
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  resend_message_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_user_email ON email_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- Add comment
COMMENT ON TABLE email_logs IS 'Tracks all email delivery attempts for monitoring and debugging';
