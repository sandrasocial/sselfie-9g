-- Phase 7 Block 2: Blueprint Delivery Enhancement
-- Add columns for PDF URL, Maya alignment, and follow-up tracking

ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS pdf_url text,
ADD COLUMN IF NOT EXISTS maya_alignment_notes text,
ADD COLUMN IF NOT EXISTS followup_0_sent_at timestamp,
ADD COLUMN IF NOT EXISTS followup_1_sent_at timestamp,
ADD COLUMN IF NOT EXISTS followup_2_sent_at timestamp;

CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_pdf_url ON blueprint_subscribers(pdf_url) WHERE pdf_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_followup ON blueprint_subscribers(followup_0_sent_at, followup_1_sent_at, followup_2_sent_at);
