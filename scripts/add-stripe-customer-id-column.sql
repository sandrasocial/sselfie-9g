-- Add stripe_customer_id column to subscriptions table
-- This column is needed to link subscriptions to Stripe customers

BEGIN;

-- Add the column if it doesn't exist
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON subscriptions(stripe_customer_id);

-- Show the updated schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

COMMIT;
