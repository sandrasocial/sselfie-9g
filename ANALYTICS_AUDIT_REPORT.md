# Analytics Data Accuracy Audit Report

**Date:** 2025-01-27  
**Issue:** Platform analytics showing 98% conversion rate (100 total users, 98 paid users) - impossibly high, likely data sync issues

---

## EXECUTIVE SUMMARY

The audit identified **6 critical issues** causing inaccurate analytics data:

1. ❌ **CRITICAL:** Paid users calculated from `users.plan` field which is **NEVER updated** when subscriptions cancel
2. ❌ **CRITICAL:** Status spelling mismatch: webhook sets `'cancelled'` but queries filter `'canceled'`
3. ❌ **HIGH:** No filter for `is_test_mode = FALSE` - test subscriptions counted as real
4. ⚠️ **MEDIUM:** No link between `users.plan` and `subscriptions.status` - data is out of sync
5. ⚠️ **MEDIUM:** User counts don't exclude deleted accounts or test users
6. ⚠️ **LOW:** Subscription queries use `WHERE status != 'canceled'` instead of `WHERE status = 'active'`

---

## 1. SUBSCRIPTIONS TABLE SCHEMA

### Current Schema (from `scripts/00-create-all-tables.sql`)

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL,  -- ⚠️ No CHECK constraint, any value allowed
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Issues Found:**
- ✅ Has `status` column
- ✅ Has `cancel_at_period_end` column
- ❌ **NO `cancelled_at` timestamp** - can't track when subscription was cancelled
- ❌ **NO `is_test_mode` column in schema** - but code references it (added via migration)
- ❌ **NO CHECK constraint on status** - allows invalid values

**Status Values Used:**
- `'active'` - Active subscription
- `'cancelled'` - Cancelled subscription (British spelling - set by webhook)
- `'canceled'` - Filtered in queries (American spelling - **SPELLING MISMATCH**)
- `'expired'` - Expired subscription
- `'trialing'` - Trial period
- `'past_due'` - Payment failed

---

## 2. STRIPE WEBHOOK - SUBSCRIPTION CANCELLATION HANDLING

### File: `app/api/webhooks/stripe/route.ts`

#### ✅ **EXISTS:** `customer.subscription.deleted` Handler (Lines 1482-1495)

```typescript
case "customer.subscription.deleted": {
  const subscription = event.data.object
  
  console.log(`[v0] Subscription cancelled: ${subscription.id}`)
  
  await sql`
    UPDATE subscriptions
    SET status = 'cancelled', updated_at = NOW()  // ⚠️ Uses 'cancelled' (British)
    WHERE stripe_subscription_id = ${subscription.id}
  `
  
  console.log(`[v0] ✅ Subscription ${subscription.id} marked as cancelled`)
  break
}
```

**Problem:** Sets status to `'cancelled'` (British spelling) but queries filter `'canceled'` (American spelling)

#### ✅ **EXISTS:** `customer.subscription.updated` Handler (Lines 1514-1530)

```typescript
case "customer.subscription.updated": {
  const sub = event.data.object
  
  const stripeStatus = sub.status // active, trialing, past_due, unpaid, canceled
  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
  
  await sql`
    UPDATE subscriptions
    SET 
      status = ${stripeStatus},  // ⚠️ Stripe uses 'canceled' (American), sets directly
      current_period_end = ${currentPeriodEnd}
    WHERE stripe_subscription_id = ${sub.id}
  `
  
  console.log(`[v0] 📝 Subscription ${sub.id} updated to status: ${stripeStatus}`)
  break
}
```

**Problem:** Stripe sends `'canceled'` (American), but `customer.subscription.deleted` sets `'cancelled'` (British) - **inconsistent**

#### ✅ **EXISTS:** `invoice.payment_failed` Handler (Lines 1497-1512)

```typescript
case "invoice.payment_failed": {
  const invoice = event.data.object
  
  if (!invoice.subscription) break
  
  const subscriptionId = invoice.subscription
  
  await sql`
    UPDATE subscriptions
    SET status = 'past_due'
    WHERE stripe_subscription_id = ${subscriptionId}
  `
  
  console.log(`[v0] ⚠️ Payment failed for subscription ${subscriptionId} - marked as past_due`)
  break
}
```

**Status:** ✅ Correctly handles payment failures

---

## 3. PLATFORM ANALYTICS CALCULATION

### File: `app/api/admin/alex/chat/route.ts` (Lines 5965-6067)

#### Issue 1: Paid Users Calculation (Line 5974)

**Current Query:**
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users_this_week,
  COUNT(CASE WHEN plan != 'free' AND plan IS NOT NULL THEN 1 END) as paid_users  -- ❌ WRONG
FROM users
WHERE email IS NOT NULL
```

**Problem:**
- ❌ Counts `users.plan != 'free'` - **this field is NEVER updated when subscriptions cancel**
- ❌ No filter for `is_test_mode`
- ❌ No filter for deleted accounts
- ❌ Doesn't check `subscriptions.status = 'active'`

**Impact:** Users with cancelled subscriptions are still counted as "paid users"

#### Issue 2: Revenue Stats Query (Lines 6002-6009)

**Current Query:**
```sql
SELECT 
  COUNT(CASE WHEN plan = 'sselfie_studio' THEN 1 END) as sselfie_studio_members,
  COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_users,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
FROM subscriptions
WHERE status != 'canceled'  -- ❌ SPELLING MISMATCH: webhook sets 'cancelled'
```

**Problems:**
- ❌ Filters `WHERE status != 'canceled'` but webhook sets `'cancelled'` - **cancelled subscriptions are NOT excluded**
- ❌ No filter for `is_test_mode = FALSE` - **test subscriptions counted as real**
- ❌ Uses `subscriptions.plan` column which may not exist (schema shows `plan_name`)

**Impact:** Cancelled subscriptions are counted as active, test subscriptions are included

---

## 4. REVENUE METRICS CALCULATION

### File: `app/api/admin/alex/chat/route.ts` (Lines 5738-5747)

**Current Query:**
```sql
SELECT
  COUNT(*)::int as total_users,
  COUNT(*) FILTER (WHERE plan = 'free')::int as free_users,
  COUNT(*) FILTER (WHERE plan = 'studio_membership')::int as studio_members,
  COUNT(*) FILTER (WHERE plan = 'one_time')::int as one_time_users,
  COUNT(*) FILTER (WHERE created_at >= ${startDate.toISOString()})::int as new_signups,
  COUNT(*) FILTER (WHERE plan != 'free' AND created_at >= ${startDate.toISOString()})::int as new_paid_users
FROM users
```

**Problems:**
- ❌ Counts `users.plan` - **never synced with subscriptions table**
- ❌ No filter for test accounts
- ❌ No filter for deleted accounts
- ❌ Plan values don't match subscription product types

**Impact:** Inaccurate paid user counts based on stale `users.plan` field

---

## 5. USER COUNT LOGIC

### Issues Found:

#### ❌ **Problem 1:** No Filter for Test Accounts

All user count queries use:
```sql
FROM users
WHERE email IS NOT NULL
```

**Missing filters:**
- ❌ `is_test_mode = FALSE` (if column exists)
- ❌ `deleted_at IS NULL` (if soft delete exists)
- ❌ No exclusion of test Stripe customers

#### ❌ **Problem 2:** Paid Users Based on `users.plan` Field

**Current Logic:**
```sql
COUNT(CASE WHEN plan != 'free' AND plan IS NOT NULL THEN 1 END) as paid_users
```

**Problem:** `users.plan` field is **never updated** when:
- Subscription is cancelled
- Subscription expires
- Subscription is updated
- User downgrades

**Evidence:** No code found that updates `users.plan` when subscription status changes

#### ❌ **Problem 3:** No Join to Subscriptions Table

Queries count paid users from `users.plan` instead of checking `subscriptions.status = 'active'`

**Should be:**
```sql
SELECT COUNT(DISTINCT s.user_id)
FROM subscriptions s
WHERE s.status = 'active'
  AND s.is_test_mode = FALSE
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id AND u.email IS NOT NULL)
```

---

## 6. SUBSCRIPTION STATUS SYNC

### Webhook Events Handled:

| Event | Handler | Status | Issues |
|-------|---------|--------|--------|
| `customer.subscription.created` | ✅ Lines 1143-1235 | Handled | Sets status from Stripe (may be 'canceled') |
| `customer.subscription.updated` | ✅ Lines 1514-1530 | Handled | Sets status directly from Stripe |
| `customer.subscription.deleted` | ✅ Lines 1482-1495 | Handled | **Sets 'cancelled' (British) - SPELLING MISMATCH** |
| `invoice.payment_failed` | ✅ Lines 1497-1512 | Handled | Sets status to 'past_due' |
| `invoice.payment_succeeded` | ✅ Lines 1237-1480 | Handled | Updates subscription period |

### ❌ **Missing:** `users.plan` Update

**Problem:** When subscription status changes, `users.plan` field in `users` table is **NEVER updated**

**Impact:** User still shows as "paid" even after subscription is cancelled

---

## 7. CRON JOBS - SUBSCRIPTION STATUS SYNC

### Files Found in `app/api/cron/`:

- `welcome-back-sequence/route.ts`
- `reengagement-campaigns/route.ts`
- `send-blueprint-followups/route.ts`
- `blueprint-email-sequence/route.ts`
- `sync-audience-segments/route.ts`
- `send-scheduled-campaigns/route.ts`
- `refresh-segments/route.ts`

**Result:** ❌ **NO cron job found that syncs subscription status with Stripe**

**Impact:** If webhook fails or is missed, subscription status becomes stale

---

## ROOT CAUSE ANALYSIS

### Why 98% Conversion Rate is Wrong:

The impossibly high conversion rate (98%) is caused by:

1. ✅ **Cancelled subscriptions still counted as "paid"**
   - Paid users calculated from `users.plan != 'free'`
   - `users.plan` is never updated when subscriptions cancel
   - Users with cancelled subscriptions are still counted

2. ✅ **Status spelling mismatch prevents filtering**
   - Webhook sets status to `'cancelled'` (British)
   - Queries filter `WHERE status != 'canceled'` (American)
   - Cancelled subscriptions are **NOT excluded** from counts

3. ✅ **Test subscriptions included in counts**
   - No `WHERE is_test_mode = FALSE` filter
   - Test Stripe subscriptions counted as real users

4. ✅ **No sync between `users.plan` and `subscriptions.status`**
   - Two separate sources of truth
   - `users.plan` becomes stale when subscriptions cancel
   - Analytics queries use the wrong source (`users.plan` instead of `subscriptions.status`)

---

## RECOMMENDED FIXES

### Priority: HIGH - Critical Business Metrics

#### Fix 1: Standardize Status Spelling

**File:** `app/api/webhooks/stripe/route.ts`

**Change 1.1:** Line 1489 - Use American spelling to match Stripe:
```typescript
await sql`
  UPDATE subscriptions
  SET status = 'canceled', updated_at = NOW()  // Changed from 'cancelled'
  WHERE stripe_subscription_id = ${subscription.id}
`
```

**Change 1.2:** Verify all status values match Stripe's format:
- Stripe uses: `'canceled'` (American spelling)
- Ensure consistency across all handlers

---

#### Fix 2: Fix Paid Users Calculation

**File:** `app/api/admin/alex/chat/route.ts` (Line 5974)

**Current (WRONG):**
```sql
COUNT(CASE WHEN plan != 'free' AND plan IS NOT NULL THEN 1 END) as paid_users
FROM users
WHERE email IS NOT NULL
```

**Fixed (CORRECT):**
```sql
-- Count users with ACTIVE subscriptions only
(SELECT COUNT(DISTINCT s.user_id)
 FROM subscriptions s
 INNER JOIN users u ON u.id = s.user_id
 WHERE s.status = 'active'
   AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
   AND u.email IS NOT NULL
) as paid_users
```

**OR** add separate query:
```sql
const [paidUsersCount] = await sql`
  SELECT COUNT(DISTINCT s.user_id) as paid_users
  FROM subscriptions s
  INNER JOIN users u ON u.id = s.user_id
  WHERE s.status = 'active'
    AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
    AND u.email IS NOT NULL
`
```

---

#### Fix 3: Fix Revenue Stats Query

**File:** `app/api/admin/alex/chat/route.ts` (Lines 6002-6009)

**Current (WRONG):**
```sql
SELECT 
  COUNT(CASE WHEN plan = 'sselfie_studio' THEN 1 END) as sselfie_studio_members,
  COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_users,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
FROM subscriptions
WHERE status != 'canceled'  -- Wrong spelling, includes cancelled
```

**Fixed (CORRECT):**
```sql
SELECT 
  COUNT(CASE WHEN product_type = 'sselfie_studio_membership' AND status = 'active' THEN 1 END) as sselfie_studio_members,
  COUNT(CASE WHEN product_type = 'pro' AND status = 'active' THEN 1 END) as pro_users,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
FROM subscriptions
WHERE status = 'active'  -- Only active subscriptions
  AND (is_test_mode = FALSE OR is_test_mode IS NULL)  -- Exclude test mode
```

---

#### Fix 4: Add Test Mode Filter to All Analytics Queries

**Files to Update:**
- `app/api/admin/alex/chat/route.ts` (get_platform_analytics)
- `app/api/admin/alex/chat/route.ts` (get_revenue_metrics)
- `app/api/admin/agent/analytics/route.ts`

**Add to all subscription queries:**
```sql
WHERE status = 'active'
  AND (is_test_mode = FALSE OR is_test_mode IS NULL)
```

---

### Priority: MEDIUM - Data Quality

#### Fix 5: Sync `users.plan` with Subscription Status

**File:** `app/api/webhooks/stripe/route.ts`

**Add to `customer.subscription.deleted` handler (Line 1487):**
```typescript
await sql`
  UPDATE subscriptions
  SET status = 'canceled', updated_at = NOW()
  WHERE stripe_subscription_id = ${subscription.id}
`

// NEW: Also update users.plan to 'free'
await sql`
  UPDATE users
  SET plan = 'free', updated_at = NOW()
  WHERE id = (
    SELECT user_id FROM subscriptions 
    WHERE stripe_subscription_id = ${subscription.id}
  )
`
```

**Add to `customer.subscription.updated` handler (Line 1520):**
```typescript
await sql`
  UPDATE subscriptions
  SET 
    status = ${stripeStatus},
    current_period_end = ${currentPeriodEnd}
  WHERE stripe_subscription_id = ${sub.id}
`

// NEW: Sync users.plan based on subscription status
const planValue = stripeStatus === 'active' ? 'sselfie_studio_membership' : 'free'
await sql`
  UPDATE users
  SET plan = ${planValue}, updated_at = NOW()
  WHERE id = (
    SELECT user_id FROM subscriptions 
    WHERE stripe_subscription_id = ${sub.id}
  )
`
```

---

#### Fix 6: Add Subscription Status Sync Cron Job

**New File:** `app/api/cron/sync-subscription-status/route.ts`

**Purpose:** Sync subscription status from Stripe daily to catch any missed webhooks

**Implementation:**
- Fetch all active subscriptions from database
- Query Stripe for current status
- Update database if status changed
- Log discrepancies for investigation

---

### Priority: LOW - Minor Improvements

#### Fix 7: Add `cancelled_at` Timestamp Column

**New Migration:**
```sql
ALTER TABLE subscriptions 
ADD COLUMN cancelled_at TIMESTAMPTZ;

UPDATE subscriptions
SET cancelled_at = updated_at
WHERE status IN ('canceled', 'cancelled');
```

**Update webhook handler to set `cancelled_at`:**
```typescript
await sql`
  UPDATE subscriptions
  SET 
    status = 'canceled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE stripe_subscription_id = ${subscription.id}
`
```

---

#### Fix 8: Fix Revenue Metrics Plan Values

**File:** `app/api/admin/alex/chat/route.ts` (Line 5742)

**Current:**
```sql
COUNT(*) FILTER (WHERE plan = 'studio_membership')::int as studio_members,
```

**Issue:** `users.plan` values don't match `subscriptions.product_type` values

**Better:** Join to subscriptions table for accurate counts

---

## SUMMARY OF ISSUES

| Issue | Priority | Impact | Status |
|-------|----------|--------|--------|
| Paid users from `users.plan` (never updated) | HIGH | Counts cancelled subscriptions as paid | ❌ Not Fixed |
| Status spelling mismatch ('cancelled' vs 'canceled') | HIGH | Cancelled subscriptions not filtered | ❌ Not Fixed |
| No `is_test_mode` filter in analytics | HIGH | Test subscriptions counted as real | ❌ Not Fixed |
| No sync between `users.plan` and `subscriptions.status` | MEDIUM | Data becomes stale | ❌ Not Fixed |
| No subscription status sync cron job | MEDIUM | Status can become stale if webhook fails | ❌ Not Fixed |
| No `cancelled_at` timestamp | LOW | Can't track when subscriptions cancelled | ❌ Not Fixed |

---

## TESTING RECOMMENDATIONS

After implementing fixes:

1. **Verify Status Spelling:**
   ```sql
   SELECT DISTINCT status FROM subscriptions;
   -- Should only see: 'active', 'canceled', 'past_due', 'trialing', 'expired'
   ```

2. **Check Paid Users Count:**
   ```sql
   -- Should match Stripe active subscriptions
   SELECT COUNT(DISTINCT s.user_id) 
   FROM subscriptions s
   WHERE s.status = 'active' 
     AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL);
   ```

3. **Verify Test Mode Filter:**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE is_test_mode = TRUE) as test_count,
     COUNT(*) FILTER (WHERE is_test_mode = FALSE) as live_count
   FROM subscriptions
   WHERE status = 'active';
   ```

4. **Compare users.plan vs subscriptions.status:**
   ```sql
   SELECT 
     u.id,
     u.plan as user_plan,
     s.status as subscription_status,
     s.product_type
   FROM users u
   LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
   WHERE u.plan != 'free';
   -- Should show discrepancies if users.plan is stale
   ```

---

## CONCLUSION

The 98% conversion rate is **completely wrong** due to multiple data accuracy issues. The primary causes are:

1. Paid users calculated from `users.plan` field which never updates when subscriptions cancel
2. Status spelling mismatch prevents cancelled subscriptions from being filtered
3. Test subscriptions included in counts

**Immediate Action Required:**
1. Fix paid users calculation to use `subscriptions.status = 'active'`
2. Standardize status spelling to 'canceled' (American)
3. Add `is_test_mode = FALSE` filter to all analytics queries
4. Sync `users.plan` when subscription status changes

These fixes will restore data accuracy and provide reliable business metrics.

