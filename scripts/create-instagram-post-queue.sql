-- Instagram Post Queue Table
-- Queue for automated Instagram posting
CREATE TABLE IF NOT EXISTS instagram_post_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  feed_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE,
  feed_post_id INTEGER REFERENCES feed_posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  posted_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_queue_user ON instagram_post_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_post_queue_status ON instagram_post_queue(status);
CREATE INDEX IF NOT EXISTS idx_post_queue_scheduled ON instagram_post_queue(scheduled_at) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_post_queue_feed_post ON instagram_post_queue(feed_post_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_post_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_queue_update_timestamp
BEFORE UPDATE ON instagram_post_queue
FOR EACH ROW
EXECUTE FUNCTION update_post_queue_timestamp();
