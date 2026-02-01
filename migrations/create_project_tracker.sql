-- Project Tracker Tables
-- Beautiful, ADHD-friendly task management system

-- Projects (High-level goals like "Launch High-Ticket Offer")
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#8B5CF6', -- purple
  status TEXT DEFAULT 'active', -- active, completed, paused, archived
  vision_image_url TEXT, -- Optional vision board image
  goal_date TIMESTAMP,
  progress INTEGER DEFAULT 0, -- 0-100%
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks (Individual action items)
CREATE TABLE IF NOT EXISTS project_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- urgent, high, medium, low, someday
  status TEXT DEFAULT 'todo', -- todo, in_progress, done

  -- ADHD-friendly features
  is_quick_win BOOLEAN DEFAULT FALSE, -- Tasks under 15 min
  is_deep_work BOOLEAN DEFAULT FALSE, -- Tasks requiring focus
  energy_level TEXT DEFAULT 'medium', -- high, medium, low

  -- Time tracking
  estimated_minutes INTEGER,
  actual_minutes INTEGER,

  -- Scheduling
  due_date TIMESTAMP,
  scheduled_for DATE, -- Which day to focus on this

  -- Gamification
  completed_at TIMESTAMP,
  celebration_seen BOOLEAN DEFAULT FALSE,

  -- Order (for drag-and-drop)
  order_index INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subtasks (Break down big tasks)
CREATE TABLE IF NOT EXISTS task_subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily Focus (What to work on today)
CREATE TABLE IF NOT EXISTS daily_focus (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
  priority_rank INTEGER DEFAULT 1, -- 1, 2, 3 for top 3 tasks
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, priority_rank)
);

-- Achievements/Streaks (Gamification)
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- streak, milestone, perfect_week, etc
  title TEXT NOT NULL,
  description TEXT,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  celebration_seen BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON project_tasks(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON task_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_focus_date ON daily_focus(date);

-- Insert default "High-Ticket Offer" project
INSERT INTO projects (title, description, emoji, color, vision_image_url, goal_date)
VALUES (
  'High-Ticket Offer Launch',
  'Create and launch premium service offering with landing page, booking system, and checkout flow',
  '💎',
  '#EC4899', -- pink
  '/images/img-4801.jpg', -- You can change this to your preferred vision board image
  (NOW() + INTERVAL '7 days')::TIMESTAMP
) ON CONFLICT DO NOTHING;
