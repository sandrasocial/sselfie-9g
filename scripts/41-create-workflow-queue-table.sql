-- Create workflow_queue table for Blueprint workflow routing
-- Pure PostgreSQL compatible with Neon
-- NO Supabase features, NO RLS, NO auth.uid()

CREATE TABLE IF NOT EXISTS workflow_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id integer,
  workflow_type text,
  payload jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_queue_status ON workflow_queue(status);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_subscriber ON workflow_queue(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_created ON workflow_queue(created_at DESC);
