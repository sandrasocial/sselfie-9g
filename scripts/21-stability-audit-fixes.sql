-- ============================================================================
-- PHASE 0 — STABILITY AUDIT FIXES
-- ============================================================================
-- Description: Adds missing columns and indexes identified in stability audit
-- Database: Neon PostgreSQL ONLY
-- NO Supabase, NO RLS, NO auth.uid()
-- ============================================================================

-- Add missing behavior_loop columns to blueprint_subscribers if they don't exist
DO $$
BEGIN
  -- Check and add behavior_loop_stage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blueprint_subscribers' 
    AND column_name = 'behavior_loop_stage'
  ) THEN
    ALTER TABLE blueprint_subscribers ADD COLUMN behavior_loop_stage TEXT DEFAULT 'cold';
    CREATE INDEX idx_blueprint_subscribers_behavior_loop_stage ON blueprint_subscribers(behavior_loop_stage);
  END IF;

  -- Check and add behavior_loop_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blueprint_subscribers' 
    AND column_name = 'behavior_loop_score'
  ) THEN
    ALTER TABLE blueprint_subscribers ADD COLUMN behavior_loop_score INTEGER DEFAULT 0;
  END IF;

  -- Check and add last_behavior_loop_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blueprint_subscribers' 
    AND column_name = 'last_behavior_loop_at'
  ) THEN
    ALTER TABLE blueprint_subscribers ADD COLUMN last_behavior_loop_at TIMESTAMP;
    CREATE INDEX idx_blueprint_subscribers_last_behavior_loop_at ON blueprint_subscribers(last_behavior_loop_at);
  END IF;
END $$;

-- Ensure funnel_sessions table exists
CREATE TABLE IF NOT EXISTS funnel_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  email TEXT,
  page_count INTEGER DEFAULT 0,
  scroll_depth INTEGER DEFAULT 0,
  blueprint_completed BOOLEAN DEFAULT FALSE,
  purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_session_id ON funnel_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_user_id ON funnel_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_email ON funnel_sessions(email);

-- Verify all critical tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'funnel_events') THEN
    RAISE NOTICE 'WARNING: funnel_events table missing - may need to run earlier migrations';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blueprint_subscribers') THEN
    RAISE EXCEPTION 'CRITICAL: blueprint_subscribers table missing!';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workflow_queue') THEN
    RAISE NOTICE 'WARNING: workflow_queue table missing - may need to run earlier migrations';
  END IF;
END $$;
