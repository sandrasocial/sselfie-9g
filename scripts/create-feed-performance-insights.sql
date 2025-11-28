-- Feed Performance Insights Table
-- Stores AI-generated performance analysis for user feeds
CREATE TABLE IF NOT EXISTS feed_performance_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  feed_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE,
  insights_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_insights_user ON feed_performance_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_insights_feed ON feed_performance_insights(feed_id);
CREATE INDEX IF NOT EXISTS idx_feed_insights_created ON feed_performance_insights(created_at DESC);

-- RLS Policies
-- Removed RLS policies (not compatible with Neon/standard PostgreSQL)
