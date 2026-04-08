# Revenue Data Strategy - Database as Source of Truth

## Current Problem

1. **Database stores CREDITS, not DOLLARS** in `credit_transactions.amount`
2. **Stripe API queries are slow** and can timeout (30+ seconds for all charges)
3. **Metadata may not be on charges** - it's on payment intents/checkout sessions
4. **No reliable way to calculate revenue** from database alone
5. **Subscription payments not stored** - only one-time purchases tracked
6. **No comprehensive revenue table** - data scattered across multiple tables

## How Webhooks Work (Current State)

### ✅ What IS Working:
- **Webhooks fire automatically** when payments succeed
- **Database is updated** via `checkout.session.completed` and `invoice.payment_succeeded`
- **`credit_transactions` table** stores: `stripe_payment_id`, `product_type`, `transaction_type`
- **`subscriptions` table** stores: subscription status, product_type, etc.

### ❌ What's Missing:
- **Payment amount in dollars** is NOT stored in database
- **`credit_transactions.amount`** stores CREDITS, not payment amount
- **One-time payments** don't have a dedicated revenue table
- **Revenue calculations** require Stripe API calls (slow, unreliable)

## Solution: Comprehensive Revenue Tracking in Database

### Step 1: Create `stripe_payments` Table (NEW - Comprehensive)

Create a new table to store ALL Stripe payments:
```sql
CREATE TABLE stripe_payments (
  id SERIAL PRIMARY KEY,
  stripe_payment_id TEXT UNIQUE NOT NULL, -- payment_intent_id, charge_id, or invoice_id
  stripe_invoice_id TEXT, -- For subscription payments
  stripe_subscription_id TEXT, -- For subscription payments
  stripe_customer_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  amount_cents INTEGER NOT NULL, -- Payment amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- succeeded, pending, failed, refunded
  payment_type TEXT NOT NULL, -- subscription, one_time_session, credit_topup
  product_type TEXT,
  description TEXT,
  metadata JSONB,
  payment_date TIMESTAMPTZ NOT NULL,
  is_test_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 2: Add `payment_amount_cents` to `credit_transactions` (Legacy Support)

Add column for backward compatibility:
```sql
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS payment_amount_cents INTEGER;
```

### Step 3: Update Webhook Handlers

**For `checkout.session.completed`:**
1. Retrieve payment intent from Stripe
2. Get actual payment amount (in cents)
3. Store in `stripe_payments` table (comprehensive)
4. Also update `credit_transactions.payment_amount_cents` (legacy)

**For `invoice.payment_succeeded`:**
1. Get invoice amount from Stripe
2. Store subscription payment in `stripe_payments` table
3. Link to subscription via `stripe_subscription_id`

### Step 3: Use Database as Primary Source

**Revenue Queries (Fast, Reliable) - Using `stripe_payments` table:**
```sql
-- Credit Purchase Revenue
SELECT SUM(amount_cents) / 100.0 as total
FROM stripe_payments
WHERE payment_type = 'credit_topup'
  AND status = 'succeeded'
  AND is_test_mode = FALSE;

-- One-Time Revenue (Starter Photoshoot)
SELECT SUM(amount_cents) / 100.0 as total
FROM stripe_payments
WHERE payment_type = 'one_time_session'
  AND status = 'succeeded'
  AND is_test_mode = FALSE;

-- Subscription Revenue (ALL subscription payments)
SELECT SUM(amount_cents) / 100.0 as total
FROM stripe_payments
WHERE payment_type = 'subscription'
  AND status = 'succeeded'
  AND is_test_mode = FALSE;

-- Total Revenue (ALL payments - subscriptions + one-time + credits)
SELECT SUM(amount_cents) / 100.0 as total
FROM stripe_payments
WHERE status = 'succeeded'
  AND is_test_mode = FALSE;
```

### Step 4: Backfill Historical Data

For existing records:
1. Query Stripe API for payment amounts (one-time, can be slow)
2. Update `credit_transactions.payment_amount_cents` for all existing records
3. Run as a background job (not blocking)

## Benefits

1. **Fast Queries** - Database queries are instant (< 100ms)
2. **Reliable** - Webhooks are the source of truth (automatic updates)
3. **No Timeouts** - No need to query Stripe API for revenue
4. **Accurate** - Real payment amounts, not estimates
5. **Test Mode Safe** - `is_test_mode` flag filters out test payments

## Implementation Priority

1. ✅ **HIGH**: Add `payment_amount_cents` column
2. ✅ **HIGH**: Update webhook handlers to store payment amounts
3. ⚠️ **MEDIUM**: Backfill historical data (can be done later)
4. ✅ **LOW**: Keep Stripe API as validation/backup only

## Data Flow

```
Stripe Payment Succeeds
    ↓
Webhook Fires (checkout.session.completed OR invoice.payment_succeeded)
    ↓
Retrieve Payment Details from Stripe
    ↓
Store in Database:
  PRIMARY: stripe_payments table (comprehensive)
    - All payment types (subscription, one-time, credits)
    - Payment amounts, dates, status
    - Links to subscriptions, invoices, customers
  LEGACY: credit_transactions.payment_amount_cents (backward compatibility)
    ↓
Dashboard Queries Database (FAST, RELIABLE)
  - Uses stripe_payments table (primary)
  - Falls back to credit_transactions if needed
  - No Stripe API calls needed
```

## What Gets Stored

### ✅ ALL Payment Types:
1. **Subscription Payments** - Monthly recurring payments (via `invoice.payment_succeeded`)
2. **One-Time Purchases** - Starter photoshoot ($49)
3. **Credit Purchases** - Credit top-ups
4. **Refunds** - If/when refunds occur

### ✅ ALL Payment Data:
- Payment amount (in cents)
- Payment date
- Payment status (succeeded, pending, failed, refunded)
- Payment type (subscription, one_time_session, credit_topup)
- Product type
- Customer ID
- User ID
- Invoice ID (for subscriptions)
- Subscription ID (for subscriptions)
- Metadata (all Stripe metadata preserved)

## Verification

After implementation:
1. Check webhook logs to confirm payment amounts are being stored
2. Compare database totals vs Stripe API totals (should match)
3. Monitor for any missing payments (webhook failures)

