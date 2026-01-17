-- PROMPT QUALITY BASELINE - DATABASE SCHEMA
-- Phase 2C-4-3: Quality Monitoring Infrastructure
-- 
-- Purpose: Store quality metrics for generated images
-- Retention: 30 days (configurable)
-- 
-- CRITICAL: This is observability-only
-- - Does NOT affect generation logic
-- - Does NOT affect user experience
-- - Used for internal quality tracking only

CREATE TABLE IF NOT EXISTS prompt_quality_metrics (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Generation References
  generation_id TEXT, -- Reference to generated_images.id
  prediction_id TEXT, -- Replicate prediction ID
  user_id TEXT NOT NULL, -- User who generated the image
  
  -- Prompt & Model Tracking
  prompt TEXT NOT NULL, -- Full prompt used
  prompt_hash VARCHAR(32) NOT NULL, -- SHA-256 hash (first 16 chars)
  model_used VARCHAR(255) NOT NULL, -- e.g., 'flux-dev', 'flux-schnell'
  model_version TEXT, -- Replicate version ID or similar
  
  -- Quality Signals (nullable - not all may be computed)
  face_consistency_score NUMERIC(5,2), -- 0-100 scale
  realism_score NUMERIC(5,2), -- 0-100 scale
  stability_score NUMERIC(5,2), -- 0-100 scale
  image_hash VARCHAR(32), -- Content hash for deduplication
  
  -- Image Reference
  image_url TEXT NOT NULL, -- URL to generated image
  
  -- Context & Categorization
  category VARCHAR(100), -- e.g., 'portrait', 'lifestyle', 'fashion'
  source VARCHAR(50), -- e.g., 'maya', 'studio', 'feed', 'photoshoot'
  
  -- Baseline Tracking
  is_baseline BOOLEAN NOT NULL DEFAULT true, -- Is this current system baseline?
  baseline_version VARCHAR(50) NOT NULL DEFAULT '2026-01-17-v1', -- Version identifier
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for query performance
  INDEX idx_prompt_quality_user_id (user_id),
  INDEX idx_prompt_quality_prompt_hash (prompt_hash),
  INDEX idx_prompt_quality_model (model_used),
  INDEX idx_prompt_quality_source (source),
  INDEX idx_prompt_quality_baseline (is_baseline, baseline_version),
  INDEX idx_prompt_quality_created_at (created_at DESC)
);

-- Add comment describing the table
COMMENT ON TABLE prompt_quality_metrics IS 'Quality metrics for generated images - observability only, does not affect generation';

-- Add comments for key columns
COMMENT ON COLUMN prompt_quality_metrics.prompt_hash IS 'Deterministic hash of prompt text for tracking changes';
COMMENT ON COLUMN prompt_quality_metrics.is_baseline IS 'True = current system is baseline for future comparisons';
COMMENT ON COLUMN prompt_quality_metrics.baseline_version IS 'Version identifier (e.g., 2026-01-17-v1) for tracking system changes';

-- Optional: Partition by month for easier data management
-- (Commented out - enable if needed for high volume)
-- CREATE TABLE prompt_quality_metrics_y2026m01 PARTITION OF prompt_quality_metrics
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Optional: Automatic cleanup of old data (30-day retention)
-- (Commented out - enable if needed)
-- CREATE OR REPLACE FUNCTION cleanup_old_quality_metrics()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM prompt_quality_metrics
--   WHERE created_at < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- -- Schedule cleanup (requires pg_cron extension)
-- -- SELECT cron.schedule('cleanup-quality-metrics', '0 2 * * *', 'SELECT cleanup_old_quality_metrics()');
