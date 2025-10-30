-- Create content research table to store competitive intelligence
CREATE TABLE IF NOT EXISTS content_research (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  niche VARCHAR(255) NOT NULL,
  top_creators JSONB,
  best_hooks JSONB,
  trending_hashtags JSONB,
  trending_audio JSONB,
  content_formats JSONB,
  competitive_insights TEXT,
  research_summary TEXT,
  -- Added last_updated column for tracking research freshness
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_research_user_id ON content_research(user_id);
CREATE INDEX IF NOT EXISTS idx_content_research_niche ON content_research(niche);
-- Added index for last_updated to find fresh research
CREATE INDEX IF NOT EXISTS idx_content_research_last_updated ON content_research(last_updated);
