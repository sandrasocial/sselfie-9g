-- Founder-only Maya Test Mode extends the existing feedback inbox. The public
-- support status remains new/reviewing/resolved; founder_test_status carries the
-- more useful product loop without changing existing customer rows.
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS founder_test_status TEXT,
  ADD COLUMN IF NOT EXISTS feedback_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_path TEXT,
  ADD COLUMN IF NOT EXISTS app_commit_sha TEXT,
  ADD COLUMN IF NOT EXISTS resolution_commit_sha TEXT,
  ADD COLUMN IF NOT EXISTS founder_screenshot_key TEXT,
  ADD COLUMN IF NOT EXISTS founder_screenshot_iv TEXT,
  ADD COLUMN IF NOT EXISTS founder_screenshot_auth_tag TEXT,
  ADD COLUMN IF NOT EXISTS founder_screenshot_content_type TEXT,
  ADD COLUMN IF NOT EXISTS client_report_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedback_founder_test_status_check'
  ) THEN
    ALTER TABLE feedback
      ADD CONSTRAINT feedback_founder_test_status_check
      CHECK (
        founder_test_status IS NULL OR founder_test_status IN (
          'new',
          'reproduced',
          'fixing',
          'tested',
          'deployed',
          'verified',
          'deferred'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_client_report_id
  ON feedback(client_report_id)
  WHERE client_report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_founder_test_queue
  ON feedback(founder_test_status, created_at DESC)
  WHERE founder_test_status IS NOT NULL;
