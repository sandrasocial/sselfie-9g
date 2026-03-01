CREATE TABLE IF NOT EXISTS freebie_brand_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  transformation_story TEXT,
  brand_vibe TEXT NOT NULL DEFAULT 'warm',
  strategy_json JSONB,
  resend_contact_id TEXT,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fbs_email ON freebie_brand_strategies(email);
CREATE INDEX IF NOT EXISTS idx_fbs_token ON freebie_brand_strategies(access_token);
