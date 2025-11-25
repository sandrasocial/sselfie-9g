-- Create generated_videos table for video generation tracking
-- This table was missing from the migration scripts

CREATE TABLE IF NOT EXISTS generated_videos (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_id INTEGER,
  image_source TEXT,
  video_url TEXT,
  motion_prompt TEXT,
  job_id TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id ON generated_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_status ON generated_videos(status);
CREATE INDEX IF NOT EXISTS idx_generated_videos_job_id ON generated_videos(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_created_at ON generated_videos(created_at DESC);

-- Add comments
COMMENT ON TABLE generated_videos IS 'Tracks AI-generated videos from static images';
COMMENT ON COLUMN generated_videos.job_id IS 'Replicate prediction ID for tracking generation status';
COMMENT ON COLUMN generated_videos.video_url IS 'Permanent Vercel Blob storage URL (NULL until completed)';
COMMENT ON COLUMN generated_videos.status IS 'processing, completed, or failed';
