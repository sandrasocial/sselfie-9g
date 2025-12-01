-- Hooks Library Table
-- Stores scroll-stopping hooks for content creation

CREATE TABLE IF NOT EXISTS hooks_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_text TEXT NOT NULL,
  category TEXT,
  framework TEXT,
  performance_score NUMERIC,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for search
CREATE INDEX IF NOT EXISTS idx_hooks_library_text ON hooks_library USING gin(to_tsvector('english', hook_text));
CREATE INDEX IF NOT EXISTS idx_hooks_library_category ON hooks_library(category);
CREATE INDEX IF NOT EXISTS idx_hooks_library_framework ON hooks_library(framework);
CREATE INDEX IF NOT EXISTS idx_hooks_library_performance ON hooks_library(performance_score DESC NULLS LAST);

