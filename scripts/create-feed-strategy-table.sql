-- Create feed_strategy table to store complete strategy documents
CREATE TABLE IF NOT EXISTS feed_strategy (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  feed_layout_id INTEGER,
  
  -- Strategy components
  brand_positioning TEXT,
  content_pillars JSONB, -- Array of content pillars with descriptions
  posting_schedule JSONB, -- Recommended posting times and frequency
  growth_tactics JSONB, -- Specific tactics for growth
  competitive_advantages JSONB, -- How user stands out
  
  -- Content recommendations
  hook_formulas JSONB, -- Formulas for writing hooks
  caption_templates JSONB, -- Not rigid templates, but frameworks
  hashtag_strategy JSONB, -- Which hashtags to use when
  content_format_mix JSONB, -- % of reels, carousels, single posts
  
  -- Performance tracking
  strategy_version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_feed_layout FOREIGN KEY (feed_layout_id) REFERENCES feed_layouts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feed_strategy_user_id ON feed_strategy(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_strategy_feed_layout_id ON feed_strategy(feed_layout_id);
CREATE INDEX IF NOT EXISTS idx_feed_strategy_active ON feed_strategy(is_active);
