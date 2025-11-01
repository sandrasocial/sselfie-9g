-- Admin Knowledge Base System
-- Stores proprietary admin knowledge separate from user data

CREATE TABLE IF NOT EXISTS admin_knowledge_base (
  id SERIAL PRIMARY KEY,
  knowledge_type TEXT NOT NULL, -- 'strategy', 'content_pattern', 'template', 'case_study', 'best_practice', 'industry_insight'
  category TEXT NOT NULL, -- 'instagram', 'email', 'branding', 'growth', 'general', 'photography', 'copywriting'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  use_cases JSONB DEFAULT '[]', -- Industries/niches where this applies
  confidence_level NUMERIC DEFAULT 0.8, -- Admin's confidence (0-1)
  performance_data JSONB DEFAULT '{}', -- Metrics about effectiveness
  related_tags TEXT[],
  created_by TEXT DEFAULT 'ssa@ssasocial.com',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_context_guidelines (
  id SERIAL PRIMARY KEY,
  guideline_name TEXT NOT NULL,
  description TEXT NOT NULL,
  applies_to_mode TEXT[], -- ['content', 'email', 'research']
  priority_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  guideline_text TEXT NOT NULL,
  examples JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_knowledge_type ON admin_knowledge_base(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_admin_knowledge_category ON admin_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_admin_knowledge_active ON admin_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_knowledge_confidence ON admin_knowledge_base(confidence_level DESC);
CREATE INDEX IF NOT EXISTS idx_admin_context_guidelines_mode ON admin_context_guidelines USING GIN(applies_to_mode);
CREATE INDEX IF NOT EXISTS idx_admin_context_guidelines_active ON admin_context_guidelines(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_context_guidelines_priority ON admin_context_guidelines(priority_level);

-- Seed with example knowledge
INSERT INTO admin_knowledge_base (knowledge_type, category, title, content, use_cases, confidence_level, related_tags) VALUES
('best_practice', 'instagram', 'Hook Formula for Reels', 'Start with a pattern interrupt in the first 0.5 seconds. Use text overlay that creates curiosity or addresses a pain point. Examples: "Stop scrolling if you...", "The mistake everyone makes...", "Here''s what nobody tells you about..."', '["coaching", "personal_brand", "service_business"]', 0.9, ARRAY['reels', 'hooks', 'engagement']),
('content_pattern', 'instagram', 'Value-First Content Mix', 'Optimal content ratio: 60% educational/value, 20% personal/behind-scenes, 15% inspirational, 5% promotional. This builds trust before asking for the sale.', '["all"]', 0.85, ARRAY['content_strategy', 'engagement', 'trust']),
('strategy', 'email', 'Welcome Sequence Structure', 'Day 1: Welcome + set expectations. Day 3: Share your story/why you do this. Day 5: Deliver quick win/freebie. Day 7: Introduce main offer with soft CTA. This builds relationship before selling.', '["coaching", "course_creator", "service_business"]', 0.9, ARRAY['email_marketing', 'nurture', 'conversion']);

INSERT INTO admin_context_guidelines (guideline_name, description, applies_to_mode, priority_level, guideline_text) VALUES
('Brand Voice Consistency', 'Always match the user''s communication voice from their brand profile', ARRAY['content', 'email'], 'high', 'Review the user''s communication_voice field and mirror that tone. If they selected "warm and friendly", avoid corporate jargon. If "professional and authoritative", use confident language.'),
('Visual Aesthetic Alignment', 'Content suggestions must align with user''s visual aesthetic preferences', ARRAY['content'], 'high', 'Check the user''s visual_aesthetic and settings_preference fields. If they prefer "minimalist modern", suggest clean compositions. If "warm and cozy", recommend softer lighting and intimate settings.'),
('Audience-First Approach', 'Always consider the user''s target audience when creating content', ARRAY['content', 'email', 'research'], 'critical', 'Reference the user''s ideal_audience_description, audience_challenge, and audience_transformation fields. Create content that speaks directly to these pain points and desired outcomes.');
