-- Mission Control task tracking
CREATE TABLE IF NOT EXISTS mission_control_tasks (
  id SERIAL PRIMARY KEY,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  agent_name TEXT NOT NULL, -- 'Code Health', 'Revenue Monitor', etc.
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cursor_prompt TEXT, -- If actionType is 'cursor'
  action_type TEXT NOT NULL CHECK (action_type IN ('cursor', 'alex', 'manual')),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mission_control_date ON mission_control_tasks(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_mission_control_completed ON mission_control_tasks(check_date, completed);

-- Verify
SELECT COUNT(*) as total_tasks FROM mission_control_tasks;

