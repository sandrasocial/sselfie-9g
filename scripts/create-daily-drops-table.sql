-- Daily Drops Table
-- Stores generated daily content for admin dashboard

CREATE TABLE IF NOT EXISTS daily_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  reel_content JSONB,
  caption_content JSONB,
  stories_content JSONB,
  layout_ideas JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date lookups
CREATE INDEX IF NOT EXISTS idx_daily_drops_date ON daily_drops(date DESC);

-- Index for recent drops
CREATE INDEX IF NOT EXISTS idx_daily_drops_created_at ON daily_drops(created_at DESC);

