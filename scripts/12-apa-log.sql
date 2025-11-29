-- APA Log Table
-- Logs all APA decisions and triggers for analytics
-- No impact on user experience
-- No triggers or constraints

CREATE TABLE IF NOT EXISTS apa_log (
  id SERIAL PRIMARY KEY,
  subscriber_id INTEGER NOT NULL,
  probability NUMERIC,
  nurture_stage TEXT,
  behavior_score INTEGER,
  selected_offer TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_apa_log_subscriber ON apa_log(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_apa_log_triggered_at ON apa_log(triggered_at);
CREATE INDEX IF NOT EXISTS idx_apa_log_selected_offer ON apa_log(selected_offer);

-- Add helpful comment
COMMENT ON TABLE apa_log IS 'Logs all APA (Autonomous Purchase Accelerator) decisions and triggers for analytics tracking';
