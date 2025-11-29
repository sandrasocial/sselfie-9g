-- Email Sequences System
-- Creates tables for building and managing email sequences

-- Email sequences table
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email sequence steps table
CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  subject TEXT,
  preview TEXT,
  body TEXT,
  delay_hours INTEGER DEFAULT 24,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_number)
);

-- Fixed subscriber_id to be INTEGER to match blueprint_subscribers.id column type
-- Email sequence instances table (maps sequences to subscribers)
CREATE TABLE IF NOT EXISTS email_sequence_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES email_sequences(id),
  subscriber_id INTEGER REFERENCES blueprint_subscribers(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'running',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON email_sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_instances_sequence_id ON email_sequence_instances(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_instances_subscriber_id ON email_sequence_instances(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_sequence_instances_status ON email_sequence_instances(status);
