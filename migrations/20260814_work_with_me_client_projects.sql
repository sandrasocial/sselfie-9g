CREATE TABLE IF NOT EXISTS work_with_me_client_projects (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  application_id INTEGER,
  status TEXT NOT NULL DEFAULT 'paid',
  business_name TEXT,
  business_summary TEXT,
  ideal_customer TEXT,
  current_offer TEXT,
  marketing_burden TEXT,
  ai_attempts TEXT,
  weekly_output TEXT,
  voice_examples TEXT,
  visual_direction TEXT,
  business_links TEXT,
  intake_completed_at TIMESTAMP,
  business_brain_ready_at TIMESTAMP,
  ai_team_ready_at TIMESTAMP,
  first_week_completed_at TIMESTAMP,
  handoff_completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_with_me_client_projects_application
  ON work_with_me_client_projects (application_id);
