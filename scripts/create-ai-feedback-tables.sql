-- AI response tracking table
CREATE TABLE IF NOT EXISTS feedback_ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  ai_generated_response TEXT NOT NULL,
  admin_edited_response TEXT,
  was_edited BOOLEAN DEFAULT false,
  tone_used TEXT, -- warm/professional/empathetic
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bug severity tracking table
CREATE TABLE IF NOT EXISTS feedback_bug_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'low')),
  category TEXT, -- authentication, upload, payment, generation, training, etc
  likely_cause TEXT,
  suggested_files TEXT[], -- Array of file paths to check
  admin_alerted BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_ai_responses_feedback_id ON feedback_ai_responses(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_bug_analysis_feedback_id ON feedback_bug_analysis(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_bug_analysis_severity ON feedback_bug_analysis(severity);
CREATE INDEX IF NOT EXISTS idx_feedback_bug_analysis_admin_alerted ON feedback_bug_analysis(admin_alerted);
