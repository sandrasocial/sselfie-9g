-- Phase 7 - Block 4: Full Funnel Heatmap & User Journey Tracking Layer
-- Creates high-resolution event tracking for anonymous + logged-in sessions

-- Table 1: funnel_events
-- High-resolution event tracking table for all anonymous + logged-in events
CREATE TABLE IF NOT EXISTS funnel_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: funnel_sessions
-- Stores aggregated interaction patterns per session
CREATE TABLE IF NOT EXISTS funnel_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  email TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  page_count INT DEFAULT 0,
  scroll_depth INT DEFAULT 0,
  blueprint_completed BOOLEAN DEFAULT FALSE,
  purchased BOOLEAN DEFAULT FALSE
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_funnel_events_user_id ON funnel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session_id ON funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_type ON funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON funnel_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_user_id ON funnel_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_email ON funnel_sessions(email);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_first_seen_at ON funnel_sessions(first_seen_at DESC);
