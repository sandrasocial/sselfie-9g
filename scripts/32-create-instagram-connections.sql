-- Instagram API Integration Tables
-- Run this script to enable Instagram analytics integration

-- Store Instagram account connections
CREATE TABLE IF NOT EXISTS instagram_connections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  instagram_username VARCHAR,
  instagram_user_id VARCHAR,
  access_token TEXT NOT NULL, -- Encrypted long-lived token (60 days)
  token_expires_at TIMESTAMP,
  refresh_token TEXT,
  account_type VARCHAR DEFAULT 'business', -- 'business' or 'creator'
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, instagram_username)
);

-- Store Instagram insights (historical data)
CREATE TABLE IF NOT EXISTS instagram_insights (
  id SERIAL PRIMARY KEY,
  connection_id INT REFERENCES instagram_connections(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  insight_date DATE NOT NULL,
  metric_type VARCHAR NOT NULL, -- 'impressions', 'reach', 'engagement', 'follower_count', etc.
  value NUMERIC,
  breakdown JSONB, -- Detailed breakdown by demographics, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(connection_id, insight_date, metric_type)
);

-- Store Instagram posts for tracking
CREATE TABLE IF NOT EXISTS instagram_posts (
  id SERIAL PRIMARY KEY,
  connection_id INT REFERENCES instagram_connections(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  instagram_post_id VARCHAR UNIQUE NOT NULL,
  post_type VARCHAR, -- 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'STORY'
  caption TEXT,
  media_url TEXT,
  permalink TEXT,
  posted_at TIMESTAMP,
  impressions INT DEFAULT 0,
  reach INT DEFAULT 0,
  engagement INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  saves INT DEFAULT 0,
  shares INT DEFAULT 0,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Aggregate platform-wide Instagram metrics (for admin dashboard)
CREATE TABLE IF NOT EXISTS instagram_platform_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL UNIQUE,
  total_connected_accounts INT DEFAULT 0,
  total_followers BIGINT DEFAULT 0,
  total_impressions BIGINT DEFAULT 0,
  total_reach BIGINT DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  avg_engagement_rate NUMERIC(5,2),
  top_performing_users JSONB,
  insights JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instagram_connections_user_id ON instagram_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_insights_connection_id ON instagram_insights(connection_id);
CREATE INDEX IF NOT EXISTS idx_instagram_insights_date ON instagram_insights(insight_date);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_connection_id ON instagram_posts(connection_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_posted_at ON instagram_posts(posted_at);
CREATE INDEX IF NOT EXISTS idx_instagram_platform_metrics_date ON instagram_platform_metrics(metric_date);

COMMENT ON TABLE instagram_connections IS 'Stores user Instagram account connections with OAuth tokens';
COMMENT ON TABLE instagram_insights IS 'Historical Instagram metrics fetched daily';
COMMENT ON TABLE instagram_posts IS 'Individual Instagram posts with performance metrics';
COMMENT ON TABLE instagram_platform_metrics IS 'Aggregated platform-wide Instagram analytics';
