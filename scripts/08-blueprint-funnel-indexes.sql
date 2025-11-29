-- Blueprint Funnel Optimization Indexes
-- Improves query performance for funnel metrics and Agent Kit classification

-- Index on email for fast lookups during email capture
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_email ON blueprint_subscribers(email);

-- Index on created_at for time-based queries and funnel analytics
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_created_at ON blueprint_subscribers(created_at DESC);

-- Index on source for tracking where subscribers come from (landing_page, etc.)
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_source ON blueprint_subscribers(source);

-- Index on blueprint_completed for conversion tracking
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_blueprint_completed ON blueprint_subscribers(blueprint_completed);

-- Index on engagement_score for Agent Kit lead classification
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_engagement_score ON blueprint_subscribers(engagement_score);

-- Composite index for funnel analytics (source + created_at)
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_source_created ON blueprint_subscribers(source, created_at DESC);

-- Composite index for conversion rate tracking
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_completed_created ON blueprint_subscribers(blueprint_completed, created_at DESC);

-- Composite index for engagement scoring queries
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_completed_score ON blueprint_subscribers(blueprint_completed, engagement_score DESC);
