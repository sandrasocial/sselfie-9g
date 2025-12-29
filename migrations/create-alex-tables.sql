-- Alex Suggestion History Table
-- Tracks when users dismiss proactive suggestions from Alex
CREATE TABLE IF NOT EXISTS alex_suggestion_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  suggestion_type VARCHAR(100) NOT NULL,
  suggestion_text TEXT,
  reasoning TEXT,
  priority INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  acted_upon BOOLEAN DEFAULT FALSE,
  acted_upon_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for alex_suggestion_history
CREATE INDEX IF NOT EXISTS idx_alex_suggestion_user_type ON alex_suggestion_history(user_id, suggestion_type);
CREATE INDEX IF NOT EXISTS idx_alex_suggestion_dismissed_at ON alex_suggestion_history(dismissed_at);
CREATE INDEX IF NOT EXISTS idx_alex_suggestion_acted_upon ON alex_suggestion_history(acted_upon, acted_upon_at);
CREATE INDEX IF NOT EXISTS idx_alex_suggestion_created_at ON alex_suggestion_history(created_at DESC);

-- Testimonials Table
-- Stores customer testimonials for display and reference
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  testimonial_text TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  screenshot_url TEXT,
  image_url_2 TEXT,
  image_url_3 TEXT,
  image_url_4 TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for testimonials
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(is_featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(is_published);
CREATE INDEX IF NOT EXISTS idx_testimonials_rating ON testimonials(rating);
CREATE INDEX IF NOT EXISTS idx_testimonials_collected_at ON testimonials(collected_at DESC);

-- Comments for documentation
COMMENT ON TABLE alex_suggestion_history IS 'Tracks when users dismiss proactive suggestions from Alex to prevent showing the same suggestion too frequently';
COMMENT ON COLUMN alex_suggestion_history.acted_upon IS 'Whether the user acted on this suggestion (e.g., created the email, set up the automation)';
COMMENT ON COLUMN alex_suggestion_history.acted_upon_at IS 'Timestamp when the user acted on this suggestion';
COMMENT ON TABLE testimonials IS 'Customer testimonials for display on website and use in email campaigns';

