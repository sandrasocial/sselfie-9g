-- CREDIT-INTEGRITY-02: correlate each Motion charge with the durable video row so
-- reconciliation can refund a killed/abandoned job without guessing by timestamp.
ALTER TABLE generated_videos
  ADD COLUMN IF NOT EXISTS credit_reference_id TEXT;

CREATE INDEX IF NOT EXISTS idx_generated_videos_credit_reference_id
  ON generated_videos (credit_reference_id)
  WHERE credit_reference_id IS NOT NULL;
