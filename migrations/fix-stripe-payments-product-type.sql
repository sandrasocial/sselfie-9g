-- Fix misfiled stripe_payments rows where product_type='one_time_session'
-- but Stripe session metadata clearly shows product_type='sselfie_studio_membership'.
-- Root cause: early beta webhook code (Nov-Dec 2025) stored Studio membership
-- first-month payments as one_time_session. Subscription renewals are unaffected
-- (they're correctly stored via invoice.payment_succeeded).

-- Preview before running:
-- SELECT COUNT(*), SUM(amount_cents)/100.0 AS total_usd
-- FROM stripe_payments
-- WHERE product_type = 'one_time_session'
--   AND metadata->>'product_type' = 'sselfie_studio_membership';
-- Expected: 39 rows, ~$2,086.50

UPDATE stripe_payments
SET
  product_type = 'sselfie_studio_membership',
  payment_type = 'subscription',
  description  = COALESCE(
    NULLIF(description, 'One-time session purchase'),
    'Studio membership payment (corrected from metadata)'
  ),
  updated_at   = NOW()
WHERE product_type = 'one_time_session'
  AND metadata->>'product_type' = 'sselfie_studio_membership';

-- Verify after running:
-- SELECT product_type, payment_type, COUNT(*), SUM(amount_cents)/100.0 AS total
-- FROM stripe_payments
-- WHERE created_at > NOW() - INTERVAL '120 days'
-- GROUP BY product_type, payment_type
-- ORDER BY total DESC;
