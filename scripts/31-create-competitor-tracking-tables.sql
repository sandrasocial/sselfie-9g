-- Competitor Tracking System for Admin Agent

-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(255),
  instagram_handle VARCHAR(255),
  website_url TEXT,
  target_audience TEXT,
  unique_selling_points TEXT,
  content_strategy TEXT,
  posting_frequency VARCHAR(100),
  engagement_rate DECIMAL(5,2),
  follower_count INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Competitor content analysis
CREATE TABLE IF NOT EXISTS competitor_content_analysis (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES competitors(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  content_themes JSONB,
  top_performing_posts JSONB,
  hashtag_strategy JSONB,
  visual_style TEXT,
  caption_style TEXT,
  engagement_metrics JSONB,
  insights TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Competitor tracking snapshots (for historical comparison)
CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES competitors(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  follower_count INTEGER,
  engagement_rate DECIMAL(5,2),
  post_count INTEGER,
  metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_content_analysis_competitor_id ON competitor_content_analysis(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_content_analysis_date ON competitor_content_analysis(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_competitor_id ON competitor_snapshots(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_date ON competitor_snapshots(snapshot_date DESC);
