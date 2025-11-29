-- Phase 2: Post-Blueprint Conversion System
-- Adds tracking fields for post-blueprint user journey

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS blueprint_opened_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS post_blueprint_stage TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS last_engagement_event TIMESTAMP,
ADD COLUMN IF NOT EXISTS conversion_score INTEGER DEFAULT 0;

-- Create post_blueprint_segment table for hot lead prediction
CREATE TABLE IF NOT EXISTS post_blueprint_segment (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES blueprint_subscribers(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- 'cold', 'warm', 'hot'
  score INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blueprint_post_stage ON blueprint_subscribers(post_blueprint_stage);
CREATE INDEX IF NOT EXISTS idx_blueprint_last_engagement ON blueprint_subscribers(last_engagement_event);
CREATE INDEX IF NOT EXISTS idx_blueprint_conversion_score ON blueprint_subscribers(conversion_score);
CREATE INDEX IF NOT EXISTS idx_post_segment_stage ON post_blueprint_segment(stage);
CREATE INDEX IF NOT EXISTS idx_post_segment_score ON post_blueprint_segment(score DESC);

COMMENT ON COLUMN blueprint_subscribers.blueprint_opened_at IS 'Timestamp when user first opened their delivered blueprint';
COMMENT ON COLUMN blueprint_subscribers.post_blueprint_stage IS 'Current stage in post-blueprint funnel: not_started, opened, nurture, upsell';
COMMENT ON COLUMN blueprint_subscribers.last_engagement_event IS 'Last interaction timestamp for funnel tracking';
COMMENT ON COLUMN blueprint_subscribers.conversion_score IS 'Predictive score for conversion likelihood (0-100)';

COMMENT ON TABLE post_blueprint_segment IS 'Hot lead prediction map for blueprint subscribers';
