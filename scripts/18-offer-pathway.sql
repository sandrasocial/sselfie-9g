-- Add offer intelligence columns to blueprint_subscribers
ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS offer_stage TEXT DEFAULT 'lead',  -- lead / nurture / warm / hot / customer
ADD COLUMN IF NOT EXISTS offer_recommendation TEXT,        -- membership | credits | studio | trial
ADD COLUMN IF NOT EXISTS offer_sequence JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS offer_last_computed_at TIMESTAMPTZ;

-- Create offer pathway log table
CREATE TABLE IF NOT EXISTS offer_pathway_log (
  id BIGSERIAL PRIMARY KEY,
  subscriber_id BIGINT NOT NULL,
  old_recommendation TEXT,
  new_recommendation TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_offer_stage ON blueprint_subscribers(offer_stage);
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_offer_recommendation ON blueprint_subscribers(offer_recommendation);
CREATE INDEX IF NOT EXISTS idx_offer_pathway_log_subscriber_id ON offer_pathway_log(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_offer_pathway_log_created_at ON offer_pathway_log(created_at);
