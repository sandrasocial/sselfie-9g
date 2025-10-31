-- Academy Tables for Video & Interactive Courses

-- Academy courses
CREATE TABLE IF NOT EXISTS academy_courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER, -- Total course duration
  level TEXT CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  category TEXT, -- e.g., 'Personal Branding', 'AI Tools', 'Content Creation'
  tier TEXT CHECK (tier IN ('foundation', 'professional', 'enterprise')), -- Required membership tier
  thumbnail_url TEXT,
  instructor_name TEXT,
  total_lessons INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0, -- For sorting courses
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academy lessons (supports both video and interactive types)
CREATE TABLE IF NOT EXISTS academy_lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_number INTEGER NOT NULL, -- Order within course (1, 2, 3...)
  
  -- Lesson type determines which fields are used
  lesson_type TEXT DEFAULT 'video' CHECK (lesson_type IN ('video', 'interactive')),
  
  -- For video lessons
  video_url TEXT, -- Vercel Blob URL or external video URL
  duration_minutes INTEGER, -- Video duration
  
  -- For interactive lessons
  content JSONB, -- Structured interactive lesson content
  -- Example structure:
  -- {
  --   "steps": [
  --     {
  --       "title": "Step 1: Choose Your AI Tool",
  --       "description": "Here's how to select...",
  --       "image_url": "/screenshots/step1.png",
  --       "action_items": ["Visit ChatGPT.com", "Create account"],
  --       "tool_links": [{"name": "ChatGPT", "url": "https://..."}]
  --     }
  --   ],
  --   "embedded_tutorial_url": "https://scribehow.com/...",
  --   "resources": [{"title": "Guide", "url": "..."}]
  -- }
  
  -- Downloadable resources (PDFs, worksheets, etc.)
  resources JSONB, -- Array of {title, url, type}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User course enrollments
-- Changed user_id from UUID to CHARACTER VARYING to match users table
CREATE TABLE IF NOT EXISTS user_academy_enrollments (
  id SERIAL PRIMARY KEY,
  user_id CHARACTER VARYING REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES academy_courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0, -- 0-100
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- User lesson progress
-- Changed user_id from UUID to CHARACTER VARYING to match users table
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id CHARACTER VARYING REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES academy_lessons(id) ON DELETE CASCADE,
  
  -- For video lessons
  watch_time_seconds INTEGER DEFAULT 0, -- How much of video watched
  
  -- For interactive lessons
  completed_steps JSONB DEFAULT '[]', -- Array of completed step indices
  
  -- Universal fields
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, lesson_id)
);

-- Exercises/quizzes (can be attached to any lesson)
CREATE TABLE IF NOT EXISTS academy_exercises (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES academy_lessons(id) ON DELETE CASCADE,
  exercise_type TEXT CHECK (exercise_type IN ('multiple_choice', 'text_input', 'checkbox', 'image_selection')),
  question TEXT NOT NULL,
  options JSONB, -- For multiple choice: ["Option 1", "Option 2", ...]
  correct_answer TEXT, -- For validation
  explanation TEXT, -- Shown after submission
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User exercise submissions
-- Changed user_id from UUID to CHARACTER VARYING to match users table
CREATE TABLE IF NOT EXISTS academy_exercise_submissions (
  id SERIAL PRIMARY KEY,
  user_id CHARACTER VARYING REFERENCES users(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES academy_exercises(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Certificates (generated when course is completed)
-- Changed user_id from UUID to CHARACTER VARYING to match users table
CREATE TABLE IF NOT EXISTS academy_certificates (
  id SERIAL PRIMARY KEY,
  user_id CHARACTER VARYING REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES academy_courses(id) ON DELETE CASCADE,
  certificate_url TEXT NOT NULL, -- Vercel Blob URL to certificate PDF/image
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_academy_courses_level ON academy_courses(level);
CREATE INDEX IF NOT EXISTS idx_academy_courses_tier ON academy_courses(tier);
CREATE INDEX IF NOT EXISTS idx_academy_courses_status ON academy_courses(status);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_course_id ON academy_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_type ON academy_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON user_academy_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_course_id ON user_academy_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_exercises_lesson_id ON academy_exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_exercise_submissions_user_id ON academy_exercise_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON academy_certificates(user_id);
