# REVENUE STRUCTURE AUDIT

**Date:** 2025-01-27  
**Purpose:** Comprehensive audit of ALL revenue sources to identify analytics gaps

---

## 1. PAYMENT TABLES FOUND

### subscriptions Table
**Schema:**
```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  product_type TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Stores monthly recurring subscriptions (Studio Membership)

---

### credit_transactions Table
**Schema:**
```sql
CREATE TABLE credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id CHARACTER VARYING REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for purchases, negative for usage
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'purchase',           -- One-time purchases (sessions, top-ups)
    'subscription_grant', -- Monthly credit grants from subscriptions
    'training',           -- Credits used for training
    'image',              -- Credits used for image generation
    'animation',           -- Credits used for animations
    'refund',              -- Refunds
    'bonus'                -- Bonus credits
  )),
  description TEXT,
  reference_id TEXT,
  stripe_payment_id TEXT,  -- ⚠️ SHOULD link to Stripe but many are NULL
  balance_after INTEGER NOT NULL,
  is_test_mode BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Stores ALL credit transactions including:
- One-time purchases (sessions, credit top-ups)
- Subscription credit grants
- Credit usage
- Refunds

**⚠️ CRITICAL FINDING:** Purchase transactions have `stripe_payment_id = NULL` in many cases!

---

### user_credits Table
**Schema:**
```sql
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id CHARACTER VARYING REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Tracks current credit balance per user

---

## 2. PAYMENT TYPES IN SYSTEM

### Monthly Subscriptions
**Table:** `subscriptions`

**Stripe Event:** 
- `checkout.session.completed` (mode = "subscription")
- `customer.subscription.created`
- `invoice.payment_succeeded` (monthly renewals)

**How Tracked:**
1. Webhook creates/updates subscription record in `subscriptions` table
2. Monthly credits granted via `credit_transactions` with `transaction_type = 'subscription_grant'`
3. Status tracked: `'active'`, `'cancelled'`, `'past_due'`, etc.

**Product Types:**
- `sselfie_studio_membership` - Content Creator Studio ($29/month)
- `brand_studio_membership` - Brand Studio (if exists)

**Current Count (from audit):**
- 36 total active subscriptions
- 24 live subscriptions (excludes test mode)
- 35 unique users

---

### One-Time Sessions
**Table:** `credit_transactions` (transaction_type = 'purchase')

**Stripe Event:**
- `checkout.session.completed` (mode = "payment", product_type = "one_time_session")

**How Tracked:**
1. Webhook calls `grantOneTimeSessionCredits(userId)` (lib/credits.ts)
2. Function grants 70 credits via `credit_transactions` table
3. **⚠️ PROBLEM:** `stripe_payment_id` is NOT stored in the transaction!

**Evidence from Code:**
```typescript
// app/api/webhooks/stripe/route.ts:689-692
else if (productType === "one_time_session") {
  console.log(`[v0] One-time session purchase for user ${userId}`)
  await grantOneTimeSessionCredits(userId)  // ⚠️ No stripe_payment_id passed!
}

// lib/credits.ts:364-367
export async function grantOneTimeSessionCredits(userId: string, isTestMode = false) {
  const credits = SUBSCRIPTION_CREDITS.one_time_session
  return await addCredits(userId, credits, "purchase", "One-Time SSELFIE Session purchase", undefined, isTestMode)
  // ⚠️ Passes `undefined` as stripePaymentId parameter!
}
```

**Current Count (from audit):**
- 78 purchase transactions
- 41 unique buyers
- **0 with Stripe payment ID** (⚠️ CRITICAL BUG)

---

### Credit Top-Ups
**Table:** `credit_transactions` (transaction_type = 'purchase')

**Stripe Event:**
- `checkout.session.completed` (mode = "payment", product_type = "credit_topup")

**How Tracked:**
1. Webhook calls `addCredits(userId, credits, "purchase", description, stripePaymentId, isTestMode)`
2. Function creates `credit_transactions` record with `stripe_payment_id`
3. ✅ This SHOULD work correctly IF `stripe_payment_id` is passed

**Evidence from Code:**
```typescript
// app/api/webhooks/stripe/route.ts:693-697
else if (productType === "credit_topup") {
  const isTestMode = !event.livemode
  await addCredits(userId, credits, "purchase", `Credit top-up purchase`, undefined, isTestMode)
  // ⚠️ stripe_payment_id is passed as `undefined` - should be session.payment_intent or invoice.payment_intent
}
```

**Current Count (from audit):**
- Included in "purchase" transactions (78 total)
- **0 with Stripe payment ID** (⚠️ CRITICAL BUG)

---

## 3. CURRENT ANALYTICS GAPS

### ✅ What's Being Counted:
- Monthly subscribers: `subscriptions.status = 'active'`
- MRR calculation: Uses `subscriptions` table with product prices
- Subscription revenue: Calculated from Stripe charges

### ❌ What's Being MISSED:
1. **One-time session buyers** - NOT counted as "paid users"
   - Stored in `credit_transactions` but analytics only check `subscriptions` table
   - Query uses `users.plan != 'free'` which doesn't include one-time buyers

2. **Credit top-up buyers** - NOT counted as "paid users"
   - Same issue as one-time sessions
   - No way to identify them from subscriptions table

3. **Users who bought but cancelled subscription** - Still counted (previous audit finding)

4. **Test mode customers** - Sometimes included in counts (previous audit finding)

---

## 4. REAL CUSTOMER COUNTS

Based on actual data from diagnostic scripts:

### Monthly Subscribers (Active)
- **24** active subscriptions (live, non-test)
- **35** unique users (some may have multiple subscriptions or test subscriptions)

### One-Time Session Buyers (All Time)
- **78** purchase transactions with `transaction_type = 'purchase'`
- **41** unique buyers
- **0** with `stripe_payment_id` (⚠️ BUG: Payment ID not being stored)

### Credit Top-Up Buyers (All Time)
- Included in purchase transactions above
- Cannot distinguish from one-time sessions in current data
- **0** with `stripe_payment_id` (⚠️ BUG)

### ⚠️ TOTAL PAYING CUSTOMERS (Current Count)
- **24** users with active subscriptions
- **0** users with one-time purchases (because `stripe_payment_id IS NULL` prevents identification)

### ✅ ACTUAL TOTAL PAYING CUSTOMERS (Estimated)
- **24** active subscribers
- **41** one-time buyers (from transaction count, but can't verify without Stripe IDs)
- **TOTAL: ~65 unique paying customers** (if no overlap)

**Note:** Overlap likely exists (users who have subscriptions AND bought one-time). Actual unique count requires querying both tables and combining.

---

## 5. REVENUE BREAKDOWN

### Monthly Recurring Revenue (MRR)
- **$696/month** (24 active subscriptions × $29/month)
- Calculated from: `subscriptions` table where `status = 'active'` and `is_test_mode = FALSE`

### One-Time Revenue (All Time)
- **Unknown** - Cannot calculate without Stripe payment IDs
- Estimate: 78 purchases × average price (unknown without Stripe data)
- Would need Stripe API to fetch actual amounts

### Credit Top-Up Revenue (All Time)
- **Unknown** - Cannot calculate (mixed with one-time sessions)
- Would need Stripe API to fetch actual amounts

### Total Revenue
- **Available via:** `app/api/admin/dashboard/revenue/route.ts` (uses Stripe API)
- **Method:** Fetches ALL charges from Stripe API
- **Includes:** Subscriptions + One-time sessions + Credit top-ups
- **Note:** This endpoint HAS access to total revenue, but analytics queries don't use it

---

## 6. STRIPE WEBHOOK PAYMENT HANDLERS

### ✅ Handlers Found:

#### 1. `checkout.session.completed` (Lines 107-1140)
**Handles:**
- Subscription purchases (mode = "subscription")
- One-time payments (mode = "payment")
  - One-time sessions (product_type = "one_time_session")
  - Credit top-ups (product_type = "credit_topup")

**What It Does:**
- Creates/updates subscription records (for subscriptions)
- Grants credits via `grantOneTimeSessionCredits()` or `addCredits()`
- **⚠️ PROBLEM:** `stripe_payment_id` not passed to credit functions for one-time payments

**Code Location:** `app/api/webhooks/stripe/route.ts:340-698`

#### 2. `invoice.payment_succeeded` (Lines 1237-1480)
**Handles:**
- Monthly subscription renewals
- First subscription payment confirmation

**What It Does:**
- Grants monthly credits via `grantMonthlyCredits()`
- Updates subscription period dates
- ✅ Correctly handles subscription credits

#### 3. `customer.subscription.deleted` (Lines 1482-1495)
**Handles:**
- Subscription cancellations

**What It Does:**
- Sets subscription status to `'cancelled'`
- ✅ Handles cancellations (but has spelling mismatch issue from previous audit)

#### 4. `customer.subscription.updated` (Lines 1514-1530)
**Handles:**
- Subscription status changes

**What It Does:**
- Updates subscription status and period end
- ✅ Handles status updates

#### 5. `invoice.payment_failed` (Lines 1497-1512)
**Handles:**
- Failed subscription payments

**What It Does:**
- Sets subscription status to `'past_due'`
- ✅ Handles payment failures

---

## 7. PRODUCT TYPE DISTINCTION

### Product Types in Stripe Metadata:
1. **`sselfie_studio_membership`** - Monthly subscription ($29/month)
2. **`one_time_session`** - One-time Instagram photoshoot (70 credits)
3. **`credit_topup`** - Additional credits purchase

### How They're Distinguished:
- **Subscriptions:** `session.mode === "subscription"` + `product_type === "sselfie_studio_membership"`
- **One-time Sessions:** `session.mode === "payment"` + `product_type === "one_time_session"`
- **Credit Top-ups:** `session.mode === "payment"` + `product_type === "credit_topup"`

---

## 8. CURRENT ANALYTICS QUERIES

### ❌ Platform Analytics (get_platform_analytics)
**File:** `app/api/admin/alex/chat/route.ts:5969-5977`

**Current Query:**
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN plan != 'free' AND plan IS NOT NULL THEN 1 END) as paid_users
FROM users
WHERE email IS NOT NULL
```

**Problems:**
1. Uses `users.plan` field (never updated when subscriptions cancel)
2. Doesn't check `subscriptions` table
3. Doesn't check `credit_transactions` for one-time buyers
4. **MISSES:** All one-time session buyers
5. **MISSES:** All credit top-up buyers

---

### ❌ Revenue Metrics (get_revenue_metrics)
**File:** `app/api/admin/alex/chat/route.ts:5738-5747`

**Current Query:**
```sql
SELECT
  COUNT(*) FILTER (WHERE plan = 'studio_membership')::int as studio_members,
  COUNT(*) FILTER (WHERE plan = 'one_time')::int as one_time_users
FROM users
```

**Problems:**
1. Uses `users.plan` field (stale data)
2. `plan = 'one_time'` likely doesn't exist or isn't set
3. Doesn't query `credit_transactions` table
4. **MISSES:** Actual one-time buyers

---

### ✅ Revenue Dashboard (Working Correctly)
**File:** `app/api/admin/dashboard/revenue/route.ts`

**Current Method:**
- Uses Stripe API to fetch ALL charges
- Calculates total revenue correctly
- Includes subscriptions + one-time payments
- **✅ THIS WORKS** - but analytics queries don't use this method

---

## 9. RECOMMENDED FIXES

### Fix 1: Fix Stripe Payment ID Storage (CRITICAL)

**File:** `app/api/webhooks/stripe/route.ts`

**Problem:** One-time payments don't store `stripe_payment_id` in `credit_transactions`

**Fix for One-Time Sessions (Line 689-692):**
```typescript
else if (productType === "one_time_session") {
  console.log(`[v0] One-time session purchase for user ${userId}`)
  // Get payment intent ID from session
  const paymentIntentId = session.payment_intent as string
  await grantOneTimeSessionCredits(userId, paymentIntentId)  // Pass payment ID
}
```

**Fix for Credit Top-Ups (Line 693-697):**
```typescript
else if (productType === "credit_topup") {
  const isTestMode = !event.livemode
  const paymentIntentId = session.payment_intent as string
  await addCredits(userId, credits, "purchase", `Credit top-up purchase`, paymentIntentId, isTestMode)
}
```

**Also Update:** `grantOneTimeSessionCredits()` function to accept and store `stripe_payment_id`

---

### Fix 2: Fix Paid Users Calculation

**File:** `app/api/admin/alex/chat/route.ts:5969-5977`

**Current (WRONG):**
```sql
COUNT(CASE WHEN plan != 'free' AND plan IS NOT NULL THEN 1 END) as paid_users
FROM users
```

**Fixed (CORRECT):**
```sql
-- Count users with active subscriptions
(SELECT COUNT(DISTINCT s.user_id)
 FROM subscriptions s
 WHERE s.status = 'active'
   AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
) 
+
-- Count users with one-time purchases
(SELECT COUNT(DISTINCT ct.user_id)
 FROM credit_transactions ct
 WHERE ct.transaction_type = 'purchase'
   AND ct.stripe_payment_id IS NOT NULL
   AND (ct.is_test_mode = FALSE OR ct.is_test_mode IS NULL)
) as paid_users
```

**Better Approach (Combined):**
```sql
SELECT COUNT(DISTINCT user_id) as paid_users
FROM (
  -- Users with active subscriptions
  SELECT DISTINCT user_id
  FROM subscriptions
  WHERE status = 'active'
    AND (is_test_mode = FALSE OR is_test_mode IS NULL)
  
  UNION
  
  -- Users with one-time purchases
  SELECT DISTINCT user_id
  FROM credit_transactions
  WHERE transaction_type = 'purchase'
    AND stripe_payment_id IS NOT NULL
    AND (is_test_mode = FALSE OR is_test_mode IS NULL)
) as paying_customers
```

---

### Fix 3: Add Revenue Breakdown by Source

**File:** `app/api/admin/alex/chat/route.ts` (get_revenue_metrics)

**Add Query:**
```sql
-- Subscription revenue (MRR)
SELECT 
  COUNT(*) * 29 as mrr  -- Assuming $29/month
FROM subscriptions
WHERE status = 'active'
  AND (is_test_mode = FALSE OR is_test_mode IS NULL)

-- One-time revenue (requires Stripe API - use existing revenue endpoint)
-- OR estimate from credit_transactions if payment IDs are fixed
```

---

### Fix 4: Distinguish One-Time Sessions vs Credit Top-Ups

**Add to credit_transactions table:**
```sql
ALTER TABLE credit_transactions
ADD COLUMN product_type TEXT;

-- Update existing purchases if possible
UPDATE credit_transactions
SET product_type = 'one_time_session'
WHERE transaction_type = 'purchase'
  AND description LIKE '%one-time session%';

UPDATE credit_transactions
SET product_type = 'credit_topup'
WHERE transaction_type = 'purchase'
  AND description LIKE '%credit top-up%';
```

**Update webhook handlers** to store `product_type` when creating purchase transactions.

---

## 10. SUMMARY OF CRITICAL ISSUES

| Issue | Priority | Impact |
|-------|----------|--------|
| `stripe_payment_id` not stored for one-time payments | **HIGH** | Cannot identify paying customers from purchases |
| Paid users only counts subscriptions | **HIGH** | 41 one-time buyers not counted as "paid users" |
| Revenue metrics use `users.plan` (stale data) | **HIGH** | Inaccurate paid user counts |
| Cannot distinguish sessions vs top-ups | **MEDIUM** | Can't break down one-time revenue by product |
| Test mode sometimes included | **MEDIUM** | Inflated customer counts |

---

## 11. QUERY TO COUNT ALL PAYING CUSTOMERS (FIXED)

```sql
-- Count ALL unique paying customers
WITH subscription_customers AS (
  SELECT DISTINCT user_id
  FROM subscriptions
  WHERE status = 'active'
    AND (is_test_mode = FALSE OR is_test_mode IS NULL)
),
purchase_customers AS (
  SELECT DISTINCT user_id
  FROM credit_transactions
  WHERE transaction_type = 'purchase'
    AND stripe_payment_id IS NOT NULL  -- Only real payments
    AND (is_test_mode = FALSE OR is_test_mode IS NULL)
)
SELECT COUNT(DISTINCT user_id) as total_paying_customers
FROM (
  SELECT user_id FROM subscription_customers
  UNION
  SELECT user_id FROM purchase_customers
) as all_paying_customers
```

**Note:** This query will work AFTER Fix #1 (storing stripe_payment_id) is implemented.

---

## CONCLUSION

The analytics system is **significantly undercounting paying customers** because:

1. ❌ Only counts subscriptions (misses 41+ one-time buyers)
2. ❌ One-time payments don't store Stripe payment IDs (can't verify real payments)
3. ❌ Uses stale `users.plan` field instead of querying actual payment data

**Estimated Real Count:**
- **24** active subscribers
- **41** one-time buyers (estimated, can't verify without Stripe IDs)
- **Total: ~65 unique paying customers** (vs current count of 24-36)

**Revenue Impact:**
- Current MRR: $696/month (subscribers only)
- Missing: Unknown amount from one-time sales (no Stripe IDs to calculate)
- **Total revenue available via Stripe API** but not reflected in analytics queries

**Immediate Action Required:**
1. Fix Stripe payment ID storage for one-time payments
2. Update paid users query to include purchase transactions
3. Use Stripe API for revenue data (already available in revenue dashboard endpoint)

