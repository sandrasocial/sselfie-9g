-- Add open/click/conversion tracking columns to email_logs
-- Required by app/api/webhooks/resend/route.ts which tries to UPDATE these columns
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS)

ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS opened      BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS opened_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked     BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS clicked_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted   BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Partial indexes — only index the rows that actually have data
CREATE INDEX IF NOT EXISTS idx_email_logs_opened
  ON email_logs(opened_at DESC)
  WHERE opened = true;

CREATE INDEX IF NOT EXISTS idx_email_logs_clicked
  ON email_logs(clicked_at DESC)
  WHERE clicked = true;

CREATE INDEX IF NOT EXISTS idx_email_logs_converted
  ON email_logs(converted_at DESC)
  WHERE converted = true;

COMMENT ON COLUMN email_logs.opened      IS 'True once Resend fires email.opened webhook';
COMMENT ON COLUMN email_logs.opened_at   IS 'Timestamp of first open event from Resend webhook';
COMMENT ON COLUMN email_logs.clicked     IS 'True once Resend fires email.clicked webhook';
COMMENT ON COLUMN email_logs.clicked_at  IS 'Timestamp of first click event from Resend webhook';
COMMENT ON COLUMN email_logs.converted   IS 'Manually set true when a purchase is attributed to this send';
COMMENT ON COLUMN email_logs.converted_at IS 'Timestamp of conversion attribution';
