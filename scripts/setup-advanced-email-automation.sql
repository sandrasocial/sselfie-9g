-- Advanced Email Automation System
-- A/B Testing, Segmentation, Re-Engagement, and Preview System

-- ============================================
-- 1. A/B TESTING SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS email_ab_tests (
  id SERIAL PRIMARY KEY,
  test_name TEXT NOT NULL UNIQUE,
  parent_campaign_id INTEGER REFERENCES admin_email_campaigns(id),
  test_type TEXT NOT NULL, -- 'subject_line', 'cta', 'content', 'send_time'
  variant_a_campaign_id INTEGER REFERENCES admin_email_campaigns(id),
  variant_b_campaign_id INTEGER REFERENCES admin_email_campaigns(id),
  split_ratio NUMERIC DEFAULT 0.5, -- 0.5 = 50/50 split
  status TEXT DEFAULT 'draft', -- 'draft', 'running', 'completed', 'cancelled'
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  min_sample_size INTEGER DEFAULT 100, -- Minimum recipients before declaring winner
  confidence_level NUMERIC DEFAULT 0.95, -- Statistical confidence (0.95 = 95%)
  winner_variant TEXT, -- 'A', 'B', or null if no winner yet
  winner_declared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON email_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_parent_campaign ON email_ab_tests(parent_campaign_id);

-- A/B Test Results Tracking
CREATE TABLE IF NOT EXISTS email_ab_test_results (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES email_ab_tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL, -- 'A' or 'B'
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMPTZ,
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  UNIQUE(test_id, recipient_email)
);

CREATE INDEX IF NOT EXISTS idx_ab_results_test_variant ON email_ab_test_results(test_id, variant);
CREATE INDEX IF NOT EXISTS idx_ab_results_email ON email_ab_test_results(recipient_email);

-- ============================================
-- 2. ADVANCED SEGMENTATION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS email_segments (
  id SERIAL PRIMARY KEY,
  segment_name TEXT NOT NULL UNIQUE,
  segment_type TEXT NOT NULL, -- 'engagement', 'purchase_history', 'behavior', 'custom'
  criteria JSONB NOT NULL, -- Dynamic criteria for segment
  description TEXT,
  is_auto_refreshed BOOLEAN DEFAULT TRUE, -- Auto-update segment daily
  last_refreshed_at TIMESTAMPTZ,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_type ON email_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_segments_auto_refresh ON email_segments(is_auto_refreshed);

-- Segment Members (many-to-many)
CREATE TABLE IF NOT EXISTS email_segment_members (
  id SERIAL PRIMARY KEY,
  segment_id INTEGER REFERENCES email_segments(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_segment_members_segment ON email_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_email ON email_segment_members(user_email);

-- Pre-defined Auto Segments (system-managed)
-- These are automatically created and maintained
INSERT INTO email_segments (segment_name, segment_type, criteria, description, is_auto_refreshed)
VALUES
  ('highly_engaged', 'engagement', '{"last_opened_days": 7, "min_opens": 3, "min_clicks": 1}', 'Opened 3+ emails and clicked in last 7 days', TRUE),
  ('moderately_engaged', 'engagement', '{"last_opened_days": 30, "min_opens": 1, "max_opens": 2}', 'Opened 1-2 emails in last 30 days', TRUE),
  ('inactive_30d', 'engagement', '{"last_opened_days": 30, "max_opens": 0}', 'No opens in last 30 days', TRUE),
  ('inactive_60d', 'engagement', '{"last_opened_days": 60, "max_opens": 0}', 'No opens in last 60 days', TRUE),
  ('never_purchased', 'purchase_history', '{"has_purchased": false}', 'Never made a purchase', TRUE),
  ('one_time_buyers', 'purchase_history', '{"purchase_count": 1}', 'Made exactly one purchase', TRUE),
  ('repeat_customers', 'purchase_history', '{"purchase_count": {"$gte": 2}}', 'Made 2+ purchases', TRUE),
  ('blueprint_completers', 'behavior', '{"completed_blueprint": true}', 'Completed brand blueprint', TRUE),
  ('blueprint_non_converted', 'behavior', '{"completed_blueprint": true, "converted": false}', 'Completed blueprint but never purchased', TRUE)
ON CONFLICT (segment_name) DO NOTHING;

-- ============================================
-- 3. RE-ENGAGEMENT CAMPAIGNS
-- ============================================

CREATE TABLE IF NOT EXISTS reengagement_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  trigger_segment_id INTEGER REFERENCES email_segments(id),
  trigger_condition TEXT NOT NULL, -- 'inactive_30d', 'inactive_60d', 'never_opened', 'custom'
  email_template_type TEXT NOT NULL, -- 'win_back', 'we_miss_you', 'special_offer'
  subject_line TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  offer_code TEXT, -- Optional discount code
  offer_amount NUMERIC, -- Optional discount amount
  is_active BOOLEAN DEFAULT TRUE,
  send_frequency_days INTEGER DEFAULT 30, -- How often to check and send
  last_sent_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reengagement_active ON reengagement_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_reengagement_trigger ON reengagement_campaigns(trigger_segment_id);

-- Re-engagement send tracking (prevent duplicate sends)
CREATE TABLE IF NOT EXISTS reengagement_sends (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES reengagement_campaigns(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  converted BOOLEAN DEFAULT FALSE,
  UNIQUE(campaign_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_reengagement_sends_campaign ON reengagement_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reengagement_sends_email ON reengagement_sends(user_email);

-- ============================================
-- 4. EMAIL PREVIEW SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS email_previews (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES admin_email_campaigns(id),
  preview_type TEXT NOT NULL, -- 'html', 'text', 'spam_check'
  content_hash TEXT, -- Hash of content for caching
  html_preview TEXT,
  text_preview TEXT,
  spam_score NUMERIC, -- 0-100 spam score
  spam_issues TEXT[], -- Array of spam issues found
  rendering_issues TEXT[], -- Array of rendering issues
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_previews_campaign ON email_previews(campaign_id);
CREATE INDEX IF NOT EXISTS idx_previews_hash ON email_previews(content_hash);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_email_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_ab_tests_updated_at
  BEFORE UPDATE ON email_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_email_automation_updated_at();

CREATE TRIGGER email_segments_updated_at
  BEFORE UPDATE ON email_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_email_automation_updated_at();

CREATE TRIGGER reengagement_campaigns_updated_at
  BEFORE UPDATE ON reengagement_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_email_automation_updated_at();

-- Comments for documentation
COMMENT ON TABLE email_ab_tests IS 'A/B tests for email campaigns - automatically splits audience and tracks results';
COMMENT ON TABLE email_segments IS 'Dynamic email segments - auto-refreshed based on engagement and behavior';
COMMENT ON TABLE reengagement_campaigns IS 'Automated re-engagement campaigns for inactive subscribers';
COMMENT ON TABLE email_previews IS 'Email previews and spam score checks';
