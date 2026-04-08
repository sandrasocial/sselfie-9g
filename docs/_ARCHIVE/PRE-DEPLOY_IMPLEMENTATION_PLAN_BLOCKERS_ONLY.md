# PRE-DEPLOY IMPLEMENTATION PLAN — BLOCKERS ONLY

**Date:** 2025-01-XX  
**Engineer:** Senior Engineer (Implementation Plan Mode)  
**Objective:** Fix 3 critical deployment blockers identified in audit  
**Estimated Time:** 4-6 hours  
**Risk Level:** Low (surgical fixes, minimal blast radius)

## ⚠️ REVISED PLAN — KEY CORRECTIONS

This plan has been revised based on technical review. Key corrections:

### Blocker 1 (Webhook User Resolution)
- ✅ **FIXED:** Webhook now exits early if userId unresolved (does NOT continue processing)
- ✅ **FIXED:** Removed retry logic inside webhook (webhooks must be fast)
- ✅ **ADDED:** Explicit cron route authentication using `CRON_SECRET` pattern
- ✅ **ADDED:** Explicit schema details and query examples
- ✅ **ADDED:** Idempotency checks in cron job for all operations

### Blocker 2 (Credit Deduction Race Condition)
- ✅ **FIXED:** Removed BEGIN/COMMIT code (Neon serverless HTTP mode doesn't support interactive transactions)
- ✅ **FIXED:** Uses atomic UPDATE with WHERE clause (correct approach for Neon serverless)
- ✅ **FIXED:** Test expectations corrected (2 credits deducted, not 1)
- ✅ **ADDED:** Handling for UPDATE succeeds but INSERT fails scenario

### Blocker 3 (Success Page Timeout)
- ✅ **FIXED:** Uses existing `Button` component from `@/components/ui/button`
- ✅ **FIXED:** Uses existing `LoadingSpinner` component
- ✅ **ADDED:** Note that this doesn't fix root cause (webhook resolution issue)

---

## A) SCOPE AND BOUNDARIES

### Exactly What Will Change

**Files to Modify:**
1. `app/api/webhooks/stripe/route.ts` (lines 1113-1127, ~1039-1088)
   - Store pending payment when userId unresolved
   - Exit early (do NOT continue processing)
   - Add monitoring alerts

2. `lib/credits.ts` (lines 221-310)
   - Use atomic UPDATE with WHERE clause
   - Add retry logic for concurrent updates
   - Handle INSERT failure after UPDATE succeeds

3. `components/checkout/success-content.tsx` (lines 76-189)
   - Increase polling timeout from 60s to 120s
   - Add better UX messaging
   - Add manual refresh button

**New Files to Create:**
1. `app/api/cron/resolve-pending-payments/route.ts` (NEW)
   - Cron job to retry unresolved payments
   - Protected with CRON_SECRET authentication
   - Includes idempotency checks for all operations

2. `vercel.json` (UPDATE)
   - Add cron job schedule for `/api/cron/resolve-pending-payments`
   - Schedule: Every 5 minutes (`*/5 * * * *`)
   - **Example addition:**
     ```json
     {
       "path": "/api/cron/resolve-pending-payments",
       "schedule": "*/5 * * * *"
     }
     ```

### Exactly What Will NOT Change

- No UI design changes (except success page messaging)
- No component refactoring
- No architecture changes
- No new dependencies
- No changes to Stripe webhook signature verification
- No changes to credit grant logic (only deduction)
- No changes to access control logic
- No changes to feed generation logic
- No changes to database schema (unless absolutely required)

### What Is Deferred

- Automatic retry mechanism for webhook failures (manual cron job instead)
- Comprehensive monitoring dashboard (logging only)
- Credit deduction idempotency via unique constraint (retry logic instead)
- Success page real-time webhook status (polling only)

---

## B) PLAN BY BLOCKER

### BLOCKER 1: Paid Blueprint Webhook User Resolution Failure

#### Current Behavior

**File:** `app/api/webhooks/stripe/route.ts:1113-1127`

**Current Code:**
```typescript
if (!userId && isPaymentPaid) {
  console.error(`[v0] ❌ CRITICAL: Cannot resolve user_id for paid blueprint purchase`, {
    customerEmail,
    sessionId: session.id,
    paymentIntentId,
    metadata: session.metadata,
  })
  // Don't fail webhook - payment succeeded, but log prominently for manual review
  // Return success but log error for monitoring
  return NextResponse.json({ 
    received: true, 
    error: "user_id_unresolved",
    message: "Payment succeeded but user_id could not be resolved" 
  }, { status: 200 })
}
```

**Problem:** Webhook returns 200 OK, payment stored with `user_id=NULL`, but user gets no credits/entitlement. No retry mechanism.

**Evidence:**
- Line 1061: Payment stored with `user_id = NULL`
- Line 1122: Returns 200 OK even when userId unresolved
- No cron job or retry mechanism found

#### Desired Behavior

**Acceptance Criteria:**
1. If `userId` cannot be resolved, store payment in `stripe_payments` with `user_id=NULL` and `status='pending_resolution'`
2. Store customer email in `metadata` for later resolution
3. Create cron job that retries unresolved payments every 5 minutes (max 24 attempts = 2 hours)
4. Alert monitoring system when payment unresolved after 10 minutes
5. Webhook still returns 200 OK (Stripe requirement), but payment marked as pending

#### Minimal Technical Approach

**Step 1: Update Webhook to Store Pending Payment and Exit Early**
- **File:** `app/api/webhooks/stripe/route.ts:1113-1127`
- **Change:** If userId unresolved, store payment as pending and return 200 immediately (do NOT continue processing)
- **Logic:**
  1. Check if `userId` resolved (existing logic at line 1092-1110)
  2. If NOT resolved AND payment confirmed:
     - Store payment in `stripe_payments` with:
       - `user_id = NULL`
       - `status = 'pending_resolution'` (new status value)
       - `metadata` includes `customer_email`, `session_id`, `unresolved_at` timestamp
     - Log error with alert tag
     - **RETURN 200 immediately** - do NOT attempt credits, subscriptions, or feed expansion
  3. All downstream actions (credits, subscriptions, blueprint_subscribers, feed expansion) require userId - skip them if unresolved

**CRITICAL RULE:** If userId unresolved → persist pending payment + exit. Do NOT continue webhook processing.

**Step 2: Create Cron Job for Pending Payments**
- **File:** `app/api/cron/resolve-pending-payments/route.ts` (NEW)
- **Security:** Must verify `Authorization: Bearer ${CRON_SECRET}` header (same pattern as existing cron routes)
- **Implementation Pattern:** Follow `app/api/cron/admin-alerts/route.ts` authentication pattern

**Code Structure:**
```typescript
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { grantPaidBlueprintCredits } from "@/lib/credits"
// ... other imports

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron secret (REQUIRED)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error("[v0] [CRON] CRON_SECRET not configured")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[v0] [CRON] Unauthorized resolve-pending-payments cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // 2. Query pending payments
    const pendingPayments = await sql`
      SELECT id, stripe_payment_id, metadata, created_at
      FROM stripe_payments
      WHERE status = 'pending_resolution'
        AND product_type = 'paid_blueprint'
      ORDER BY created_at ASC
      LIMIT 50
    `
    
    // 3. Process each payment
    for (const payment of pendingPayments) {
      const customerEmail = payment.metadata?.customer_email
      if (!customerEmail) continue
      
      // Lookup user by email
      const [user] = await sql`
        SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
      `
      
      if (user) {
        const userId = user.id
        
        // Idempotency: Check if already processed
        const existingCredit = await sql`
          SELECT id FROM credit_transactions
          WHERE user_id = ${userId}
            AND stripe_payment_id = ${payment.stripe_payment_id}
            AND transaction_type = 'purchase'
          LIMIT 1
        `
        
        if (existingCredit.length === 0) {
          // Grant credits (has idempotency check)
          await grantPaidBlueprintCredits(userId, payment.stripe_payment_id)
          
          // Create subscription (with idempotency check)
          // ... (existing webhook logic)
          
          // Update payment status
          await sql`
            UPDATE stripe_payments
            SET user_id = ${userId}, status = 'succeeded', updated_at = NOW()
            WHERE id = ${payment.id}
          `
        }
      }
    }
    
    return NextResponse.json({ success: true, processed: pendingPayments.length })
  } catch (error) {
    console.error("[v0] [CRON] Error resolving pending payments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Logic Summary:**
1. Verify cron secret: `request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}``
2. Query `stripe_payments` WHERE `status='pending_resolution'` AND `product_type='paid_blueprint'`
3. For each payment:
   - Extract `customer_email` from `metadata->>'customer_email'`
   - Lookup user by email: `SELECT id FROM users WHERE email = $1 LIMIT 1`
   - If found:
     - **Idempotency check:** Verify credits not already granted for this payment
     - Update `stripe_payments` SET `user_id=$1, status='succeeded'`
     - Call `grantPaidBlueprintCredits(userId, paymentId)` (has idempotency check)
     - Create subscription entry (with idempotency check)
     - Update `blueprint_subscribers` (with idempotency check)
     - Expand feed from 1→9 posts (with idempotency check)
   - If not found after 24 attempts (tracked in `metadata->>'retry_count'`), mark as `status='failed_resolution'` and alert
4. Log all resolutions for monitoring

**Schema Details:**
- **Table:** `stripe_payments` (already exists)
- **Columns used:** `id`, `stripe_payment_id`, `user_id`, `status`, `metadata` (JSONB), `product_type`
- **Query:** `SELECT * FROM stripe_payments WHERE status = 'pending_resolution' AND product_type = 'paid_blueprint'`
- **Update:** `UPDATE stripe_payments SET user_id = $1, status = 'succeeded', metadata = jsonb_set(metadata, '{resolved_at}', to_jsonb(NOW()::text)) WHERE id = $2`

**Step 3: Add Monitoring Alert**
- **File:** `app/api/webhooks/stripe/route.ts:1113-1127`
- **Change:** Log prominently when payment unresolved (existing logging is sufficient)
- **Logic:**
  - Existing `console.error` with `❌ CRITICAL` tag is sufficient for monitoring
  - Optional: Add structured log entry for alerting system (if exists)

#### DB Changes

**Required:** None (existing `stripe_payments` table supports `user_id=NULL` and `status` can be extended)

**Optional Enhancement:** Add index for pending resolution queries
```sql
-- scripts/migrations/add-pending-payment-index.sql (OPTIONAL)
CREATE INDEX IF NOT EXISTS idx_stripe_payments_pending_resolution 
ON stripe_payments(status, product_type, created_at) 
WHERE status = 'pending_resolution';
```

**Migration:** Not required (status is TEXT, no constraint)

#### Edge Cases

1. **User signs up AFTER webhook processes**
   - **Handling:** Cron job will find user on next run (within 5 minutes)
   - **Verification:** Test by creating user after webhook processes

2. **Email mismatch (typo in checkout)**
   - **Handling:** Cron job won't find user, will mark as `failed_resolution` after 24 attempts
   - **Verification:** Test with invalid email in Stripe checkout

3. **Multiple payments for same email before user created**
   - **Handling:** Cron job processes all pending payments, grants credits for each
   - **Verification:** Test with 2 payments before user signup

#### Risks & Rollback

**Risk:** Cron job may grant credits twice if webhook retries succeed after cron processes
- **Mitigation:** Idempotency check in `grantPaidBlueprintCredits` (already exists at line 1136-1147)
- **Mitigation:** Check `credit_transactions` for existing payment before granting
- **Rollback:** Revert webhook changes, disable cron job in `vercel.json`, manually resolve pending payments

**Risk:** Pending payments table grows if cron job fails
- **Mitigation:** Mark as `failed_resolution` after 24 attempts, manual review process
- **Rollback:** Disable cron job, manually resolve pending payments

**Rollback Steps:**
1. Revert `app/api/webhooks/stripe/route.ts` to original (lines 1113-1127)
2. Delete `app/api/cron/resolve-pending-payments/route.ts`
3. Remove cron job from `vercel.json`
4. Manually resolve any pending payments in database: `UPDATE stripe_payments SET status='succeeded', user_id=(SELECT id FROM users WHERE email=metadata->>'customer_email') WHERE status='pending_resolution'`

#### Verification Checklist

**Manual Tests:**
1. ✅ Paid blueprint checkout with email not in database → Payment stored with `user_id=NULL, status='pending_resolution'`
2. ✅ Create user with same email → Cron job resolves payment within 5 minutes
3. ✅ Check `stripe_payments` table → Payment updated with `user_id` and `status='succeeded'`
4. ✅ Check `credit_transactions` → 60 credits granted
5. ✅ Check `subscriptions` → Paid blueprint subscription created

**Log Signals:**
- `[v0] ❌ CRITICAL: Cannot resolve user_id` → Should trigger alert
- `[v0] ✅ Resolved pending payment` → Cron job success
- `[v0] ⚠️ Payment resolution failed after 24 attempts` → Manual review needed

---

### BLOCKER 2: Credit Deduction Race Condition

#### Current Behavior

**File:** `lib/credits.ts:221-310`

**Current Code:**
```typescript
// Get current balance
const currentBalance = await getUserCredits(userId)  // Line 249
console.log("[v0] [CREDITS] Current balance before deduction:", currentBalance)

// Check if user has enough credits
if (currentBalance < amount) {  // Line 253
  return { success: false, newBalance: currentBalance, error: "..." }
}

const newBalance = currentBalance - amount  // Line 266

// Update balance
await sql`
  UPDATE user_credits
  SET 
    balance = ${newBalance},
    total_used = total_used + ${amount},
    updated_at = NOW()
  WHERE user_id = ${userId}
`  // Lines 279-286

// Record transaction
await sql`
  INSERT INTO credit_transactions (...)
`  // Lines 289-298
```

**Problem:** No transaction isolation. Two concurrent requests can both read same balance, both pass check, both deduct → double charge or negative balance.

**Evidence:**
- Line 249: Reads balance (no lock)
- Line 253: Checks balance (no lock)
- Line 279: Updates balance (no lock)
- No `BEGIN`/`COMMIT` transaction
- No `SELECT FOR UPDATE` row locking

#### Desired Behavior

**Acceptance Criteria:**
1. Credit check + deduction + transaction log must be atomic (all succeed or all fail)
2. Row must be locked during check to prevent concurrent reads
3. If concurrent update detected, retry up to 3 times with exponential backoff
4. If retry fails, return error (don't silently fail)

#### Minimal Technical Approach

**Step 1: Use Atomic UPDATE with WHERE Clause**
- **File:** `lib/credits.ts:248-286`
- **Change:** Use single atomic UPDATE that checks balance in WHERE clause
- **Pattern:** Neon serverless HTTP mode doesn't support interactive transactions, but atomic UPDATE prevents race condition
- **Logic:**
  1. Use `UPDATE ... WHERE balance >= amount` to atomically check and deduct
  2. Use `RETURNING balance` to get new balance
  3. If UPDATE affects 0 rows, balance was insufficient
  4. Insert transaction log after successful UPDATE

**Step 2: Add Retry Logic for Concurrent Updates**
- **File:** `lib/credits.ts:221-310`
- **Change:** Wrap atomic UPDATE in retry loop (max 3 attempts)
- **Logic:**
  - If UPDATE returns 0 rows, check if it's because balance insufficient or concurrent update
  - Retry with exponential backoff if concurrent update detected

**NOTE:** Neon serverless HTTP mode (`@neondatabase/serverless`) does NOT support interactive transactions (BEGIN/COMMIT). The atomic UPDATE approach is the correct solution for this environment.

**Implementation Details:**

**File:** `lib/credits.ts:221-310`

**Replace:**
```typescript
// Get current balance
const currentBalance = await getUserCredits(userId)
console.log("[v0] [CREDITS] Current balance before deduction:", currentBalance)

// Check if user has enough credits
if (currentBalance < amount) {
  return { success: false, newBalance: currentBalance, error: "..." }
}

const newBalance = currentBalance - amount

// Update balance
await sql`
  UPDATE user_credits
  SET 
    balance = ${newBalance},
    total_used = total_used + ${amount},
    updated_at = NOW()
  WHERE user_id = ${userId}
`

// Record transaction
await sql`
  INSERT INTO credit_transactions (...)
`
```

**With:**
```typescript
// Atomic credit deduction using UPDATE with WHERE clause
// This prevents race conditions without requiring interactive transactions
let attempts = 0
const maxAttempts = 3
let success = false
let finalBalance = 0
let finalError: string | undefined

while (attempts < maxAttempts && !success) {
  try {
    // First, check if user has enough credits (optimistic check, not locked)
    const currentBalance = await getUserCredits(userId)
    
    if (currentBalance < amount) {
      return {
        success: false,
        newBalance: currentBalance,
        error: `Insufficient credits. You have ${currentBalance} credits but need ${amount}.`,
      }
    }
    
    // Atomic UPDATE: only succeeds if balance >= amount
    // This prevents race condition - if two requests run concurrently,
    // only one will succeed (the one that sees balance >= amount)
    const updateResult = await sql`
      UPDATE user_credits
      SET 
        balance = balance - ${amount},
        total_used = total_used + ${amount},
        updated_at = NOW()
      WHERE user_id = ${userId}
        AND balance >= ${amount}
      RETURNING balance
    `
    
    // If UPDATE affected 0 rows, either:
    // 1. Balance was insufficient (shouldn't happen after check, but possible with race)
    // 2. Concurrent update changed balance between check and update
    if (updateResult.length === 0) {
      attempts++
      
      // Re-check balance to determine reason
      const recheckBalance = await getUserCredits(userId)
      
      if (recheckBalance < amount) {
        // Insufficient credits (race condition: another request deducted first)
        return {
          success: false,
          newBalance: recheckBalance,
          error: `Insufficient credits. You have ${recheckBalance} credits but need ${amount}.`,
        }
      }
      
      // Concurrent update detected - retry
      if (attempts < maxAttempts) {
        const delayMs = 100 * Math.pow(2, attempts - 1) // 100ms, 200ms, 400ms
        console.log(`[v0] [CREDITS] ⏳ Concurrent update detected, retrying in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue // Retry
      } else {
        finalError = `Failed to deduct credits after ${maxAttempts} attempts due to concurrent updates`
        console.error("[v0] [CREDITS] ❌ All retry attempts exhausted")
        break
      }
    }
    
    // UPDATE succeeded - get new balance
    const newBalance = updateResult[0].balance
    
    // Record transaction (after successful UPDATE)
    // ⚠️ RISK: If INSERT fails here, credits are deducted but no ledger record exists
    // This is rare but possible. Mitigation: Log error prominently, add repair tool if needed
    try {
      await sql`
        INSERT INTO credit_transactions (
          user_id, amount, transaction_type, description, 
          reference_id, balance_after
        )
        VALUES (
          ${userId}, ${-amount}, ${type}, ${description},
          ${referenceId || null}, ${newBalance}
        )
      `
    } catch (insertError: any) {
      // Credits already deducted, but transaction log failed
      // Log prominently for manual repair if needed
      console.error(`[v0] [CREDITS] ❌ CRITICAL: Credits deducted but transaction log failed:`, {
        userId,
        amount,
        newBalance,
        error: insertError.message,
      })
      // Continue - credits are deducted, user can use them
      // Admin can repair transaction log later if needed
    }
    
    finalBalance = newBalance
    success = true
    
    console.log("[v0] [CREDITS] ✅ Credits deducted successfully. New balance:", newBalance)
    
    const { invalidateCreditCache } = await import("./credits-cached")
    await invalidateCreditCache(userId)
    
  } catch (error: any) {
    attempts++
    console.error(`[v0] [CREDITS] ❌ Deduction attempt ${attempts} failed:`, error.message)
    
    if (attempts >= maxAttempts) {
      finalError = `Failed to deduct credits after ${maxAttempts} attempts: ${error.message}`
      console.error("[v0] [CREDITS] ❌ All retry attempts exhausted")
    } else {
      // Exponential backoff: 100ms, 200ms, 400ms
      const delayMs = 100 * Math.pow(2, attempts - 1)
      console.log(`[v0] [CREDITS] ⏳ Retrying in ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
}

if (!success) {
  return { success: false, newBalance: 0, error: finalError || "Failed to deduct credits" }
}

return { success: true, newBalance: finalBalance }
```

#### DB Changes

**Required:** None (Atomic UPDATE with WHERE clause works with existing schema, no transaction needed)

**Optional:** Add unique constraint on `(user_id, reference_id)` in `credit_transactions` for idempotency
- **File:** `scripts/migrations/add-credit-transaction-idempotency.sql` (OPTIONAL, deferred)
- **Reason:** Not required for race condition fix, can be added later

#### Edge Cases

1. **Concurrent requests for same user**
   - **Handling:** `SELECT FOR UPDATE` locks row, second request waits for first to commit
   - **Verification:** Simulate 2 concurrent API calls, verify only one deduction

2. **Transaction timeout (long-running lock)**
   - **Handling:** PostgreSQL will timeout after default lock timeout (30s), retry logic handles this
   - **Verification:** Test with artificial delay in transaction

3. **User credits record doesn't exist**
   - **Handling:** Check `lockedRow` existence, return error if not found
   - **Verification:** Test with user who has no `user_credits` record

#### Risks & Rollback

**Risk:** UPDATE succeeds but INSERT fails (credits deducted, no transaction log)
- **Mitigation:** Log error prominently, add repair tool to reconcile missing transaction logs
- **Rollback:** Revert to original code, manually fix any negative balances or missing transaction logs

**Risk:** UPDATE succeeds but INSERT fails (credits deducted, no transaction log)
- **Mitigation:** Try-catch around INSERT, log error prominently if INSERT fails
- **Mitigation:** Add repair tool: `SELECT user_id, balance FROM user_credits WHERE balance != (SELECT SUM(amount) FROM credit_transactions WHERE user_id = user_credits.user_id)` to find discrepancies
- **Rollback:** Revert retry logic, keep atomic UPDATE, manually repair any missing transaction logs

**Rollback Steps:**
1. Revert `lib/credits.ts:221-310` to original
2. Check for negative balances: `SELECT * FROM user_credits WHERE balance < 0`
3. Manually fix any negative balances

#### Verification Checklist

**Manual Tests:**
1. ✅ Single credit deduction → Works as before
2. ✅ Concurrent deductions (2 API calls simultaneously) → Only one succeeds, other waits
3. ✅ Insufficient credits → Returns error, no deduction
4. ✅ Transaction rollback on error → Balance unchanged

**Concurrency Simulation:**
```bash
# Terminal 1
curl -X POST http://localhost:3000/api/maya/generate-image \
  -H "Cookie: ..." \
  -d '{"conceptTitle":"Test"}'

# Terminal 2 (immediately after)
curl -X POST http://localhost:3000/api/maya/generate-image \
  -H "Cookie: ..." \
  -d '{"conceptTitle":"Test2"}'
```
**Expected:** Both requests process, but second waits for first to complete. Only 2 credits deducted total.

**Log Signals:**
- `[v0] [CREDITS] ⏳ Concurrent update detected, retrying in 100ms...` → Concurrent update detected, retrying
- `[v0] [CREDITS] ✅ Credits deducted successfully` → Atomic UPDATE succeeded
- `[v0] [CREDITS] ❌ All retry attempts exhausted` → Manual intervention needed

---

### BLOCKER 3: Success Page Polling Timeout

#### Current Behavior

**File:** `components/checkout/success-content.tsx:76-189`

**Current Code:**
```typescript
const MAX_POLL_ATTEMPTS = 30 // 30 attempts × 2s = 60s timeout

// Poll access status for paid blueprint purchases
useEffect(() => {
  // ... polling logic
  if (pollAttempts >= MAX_POLL_ATTEMPTS) {
    // Timeout - redirect anyway, user can refresh
    console.log('[SUCCESS PAGE] Polling timeout, redirecting anyway...')
    setIsPollingAccess(false)
    setTimeout(() => {
      router.push('/feed-planner?purchase=success&refresh=needed')
    }, 500)
  }
}, [isPollingAccess, isAuthenticated, purchaseType, pollAttempts, router])
```

**Problem:** 60-second timeout may be insufficient if webhook is slow. User redirected without access, sees confusing state.

**Evidence:**
- Line 79: `MAX_POLL_ATTEMPTS = 30` (30 × 2s = 60s)
- Line 160: Timeout redirects to feed planner
- No user-facing message explaining wait
- No manual refresh button

#### Desired Behavior

**Acceptance Criteria:**
1. Increase timeout to 120 seconds (60 attempts × 2s)
2. Show clear "Processing payment..." message with countdown timer
3. Add manual "Refresh Status" button if timeout occurs
4. Add "Contact Support" link if access not granted after timeout
5. Show progress indicator (X/60 attempts)

#### Minimal Technical Approach

**Step 1: Increase Timeout**
- **File:** `components/checkout/success-content.tsx:79`
- **Change:** `MAX_POLL_ATTEMPTS = 30` → `MAX_POLL_ATTEMPTS = 60`

**Step 2: Add User-Facing Message**
- **File:** `components/checkout/success-content.tsx` (add new state and UI)
- **Change:** Add loading message component
- **Logic:**
  ```typescript
  const [pollingMessage, setPollingMessage] = useState("Processing your payment...")
  const [timeRemaining, setTimeRemaining] = useState(120)
  
  // Update message based on attempts
  useEffect(() => {
    if (isPollingAccess) {
      const remaining = 120 - (pollAttempts * 2)
      setTimeRemaining(remaining)
      if (pollAttempts < 10) {
        setPollingMessage("Processing your payment...")
      } else if (pollAttempts < 30) {
        setPollingMessage("Payment confirmed, granting access...")
      } else {
        setPollingMessage("Finalizing your access...")
      }
    }
  }, [pollAttempts, isPollingAccess])
  ```

**Step 3: Add Manual Refresh Button**
- **File:** `components/checkout/success-content.tsx` (after timeout)
- **Change:** Show button instead of auto-redirect
- **Logic:**
  ```typescript
  if (pollAttempts >= MAX_POLL_ATTEMPTS) {
    return (
      <div>
        <p>Payment processing is taking longer than expected.</p>
        <Button onClick={() => window.location.reload()}>Refresh Status</Button>
        <Button onClick={() => router.push('/feed-planner?purchase=success')}>
          Continue to Feed Planner
        </Button>
      </div>
    )
  }
  ```

**Implementation Details:**

**File:** `components/checkout/success-content.tsx:76-189`

**Replace:**
```typescript
const MAX_POLL_ATTEMPTS = 30 // 30 attempts × 2s = 60s timeout
```

**With:**
```typescript
const MAX_POLL_ATTEMPTS = 60 // 60 attempts × 2s = 120s timeout
```

**Add new state (after line 78):**
```typescript
const [pollingMessage, setPollingMessage] = useState("Processing your payment...")
const [timeRemaining, setTimeRemaining] = useState(120)
const [showTimeoutActions, setShowTimeoutActions] = useState(false)
```

**Update polling logic (replace lines 156-167):**
```typescript
if (data.isPaidBlueprint) {
  // Webhook completed! Get access token and redirect
  console.log('[SUCCESS PAGE] Paid access confirmed, fetching access token...')
  setIsPollingAccess(false)
  setPollingMessage("Access granted! Redirecting...")
  
  // ... existing access token fetch logic
} else {
  // Webhook not done yet, continue polling
  setPollAttempts((prev) => prev + 1)
  
  // Update message based on progress
  const remaining = 120 - (pollAttempts * 2)
  setTimeRemaining(Math.max(0, remaining))
  
  if (pollAttempts < 20) {
    setPollingMessage("Processing your payment...")
  } else if (pollAttempts < 40) {
    setPollingMessage("Payment confirmed, granting access...")
  } else {
    setPollingMessage("Finalizing your access...")
  }

  if (pollAttempts >= MAX_POLL_ATTEMPTS) {
    // Timeout - show manual actions
    console.log('[SUCCESS PAGE] Polling timeout after 120 seconds')
    setIsPollingAccess(false)
    setShowTimeoutActions(true)
    setPollingMessage("Payment processing is taking longer than expected.")
  }
}
```

**Add UI component (before return statement, around line 190):**
```typescript
import { Button } from "@/components/ui/button"
import LoadingSpinner from "@/components/sselfie/loading-spinner"

// Show polling status
if (isPollingAccess && purchaseType === "paid_blueprint") {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-lg font-medium text-stone-900">{pollingMessage}</p>
      <p className="text-sm text-stone-600">
        {timeRemaining > 0 ? `Estimated time remaining: ${timeRemaining}s` : "Please wait..."}
      </p>
      <div className="w-64 bg-stone-200 rounded-full h-2">
        <div 
          className="bg-stone-900 h-2 rounded-full transition-all duration-1000"
          style={{ width: `${(pollAttempts / MAX_POLL_ATTEMPTS) * 100}%` }}
        />
      </div>
    </div>
  )
}

// Show timeout actions
if (showTimeoutActions && purchaseType === "paid_blueprint") {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-medium text-stone-900">
          Payment Processing
        </h2>
        <p className="text-stone-600 max-w-md">
          Your payment was successful, but access is still being processed. 
          This usually completes within a few minutes.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => window.location.reload()}
          variant="default"
        >
          Refresh Status
        </Button>
        <Button 
          onClick={() => router.push('/feed-planner?purchase=success')}
          variant="outline"
        >
          Continue to Feed Planner
        </Button>
      </div>
      <p className="text-sm text-stone-500">
        If access is not available after 5 minutes, please{" "}
        <a href="mailto:support@sselfie.ai" className="underline">
          contact support
        </a>
      </p>
    </div>
  )
}
```

**NOTE:** This UI improvement helps UX but does NOT fix the root cause. If webhook never resolves userId (Blocker 1), success page will still timeout. Fixing Blocker 1 is required for complete resolution.

#### DB Changes

**Required:** None (UI-only change)

#### Edge Cases

1. **Webhook completes after timeout but before user refreshes**
   - **Handling:** Manual refresh button will detect access immediately
   - **Verification:** Test by delaying webhook, verify refresh button works

2. **User closes browser during polling**
   - **Handling:** User can return to success page, polling resumes
   - **Verification:** Test by closing browser, reopening success page URL

3. **Network error during polling**
   - **Handling:** Polling continues, error logged, timeout still applies
   - **Verification:** Test by blocking network, verify timeout message appears

#### Risks & Rollback

**Risk:** Longer timeout may frustrate users if webhook actually failed
- **Mitigation:** Manual refresh button allows immediate check
- **Rollback:** Revert timeout to 60s, remove manual refresh button

**Risk:** UI changes may break existing success page layout
- **Mitigation:** Changes are additive, existing logic preserved
- **Rollback:** Revert `components/checkout/success-content.tsx` to original

**Rollback Steps:**
1. Revert `components/checkout/success-content.tsx:79` to `MAX_POLL_ATTEMPTS = 30`
2. Remove new UI components (polling message, timeout actions)
3. Restore original timeout redirect logic

#### Verification Checklist

**Manual Tests:**
1. ✅ Paid blueprint checkout → Success page shows "Processing payment..."
2. ✅ Wait 60s → Message updates to "Payment confirmed, granting access..."
3. ✅ Wait 120s → Timeout actions appear (refresh button, continue button)
4. ✅ Click "Refresh Status" → Polling resumes, detects access if granted
5. ✅ Click "Continue to Feed Planner" → Redirects to feed planner

**Webhook Failure Simulation:**
- **Test:** Delay webhook processing (artificial delay in webhook handler)
- **Expected:** Success page shows timeout after 120s, user can refresh manually
- **Verification:** Check browser console for polling logs

**Log Signals:**
- `[SUCCESS PAGE] Polling access: attempt X` → Polling working
- `[SUCCESS PAGE] Polling timeout after 120 seconds` → Timeout reached
- `[SUCCESS PAGE] Paid access confirmed` → Webhook completed

---

## C) PROPOSED PR BREAKDOWN

### Option A: Single PR (Recommended)

**Rationale:** All 3 fixes are independent, low risk, and can be tested together. Single PR reduces review overhead.

**PR Title:** `fix: Resolve deployment blockers - webhook user resolution, credit race condition, success page timeout`

**Files Touched:**
1. `app/api/webhooks/stripe/route.ts` (Blockers 1)
2. `lib/credits.ts` (Blocker 2)
3. `components/checkout/success-content.tsx` (Blocker 3)
4. `app/api/cron/resolve-pending-payments/route.ts` (NEW, Blocker 1)

**Tests to Run:**
1. Paid blueprint checkout end-to-end
2. Concurrent credit deduction simulation
3. Success page timeout behavior
4. Webhook user resolution retry

**Review Checklist:**
- [ ] Webhook stores pending payment when userId unresolved
- [ ] Cron job resolves pending payments correctly
- [ ] Credit deduction uses transaction + row locking
- [ ] Success page timeout increased to 120s
- [ ] Success page shows progress and manual refresh
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All existing tests pass

### Option B: Three Separate PRs (If Risk Averse)

**PR-1: Webhook User Resolution**
- Files: `app/api/webhooks/stripe/route.ts`, `app/api/cron/resolve-pending-payments/route.ts`
- Test: Paid blueprint checkout with new email

**PR-2: Credit Deduction Race Condition**
- Files: `lib/credits.ts`
- Test: Concurrent credit deductions

**PR-3: Success Page Timeout**
- Files: `components/checkout/success-content.tsx`
- Test: Success page polling and timeout

**Recommendation:** Use Option A (single PR) - fixes are independent and low risk.

---

## D) TEST PLAN (End-to-End)

### Test 1: Paid Blueprint Checkout Success

**Objective:** Verify complete flow from checkout → webhook → credits → entitlement → success page

**Steps:**
1. Start with new user (no account)
2. Navigate to `/blueprint/paid`
3. Complete checkout with test card
4. Verify webhook processes payment
5. Verify 60 credits granted (`credit_transactions` table)
6. Verify `blueprint_subscribers.paid_blueprint_purchased=TRUE`
7. Verify `subscriptions` record created
8. Verify success page detects access within 120s
9. Verify redirect to `/blueprint/paid?access=...`

**Expected Results:**
- ✅ Payment stored in `stripe_payments` with `user_id` (if user exists) or `user_id=NULL, status='pending_resolution'` (if new)
- ✅ 60 credits granted within 5 minutes (webhook or cron)
- ✅ Success page shows "Processing payment..." → "Access granted!" → Redirects
- ✅ Feed expanded from 1→9 posts (if user had preview feed)

**Failure Scenarios:**
- ❌ If userId unresolved: Payment stored as pending, cron job resolves within 5 minutes
- ❌ If webhook slow: Success page waits 120s, shows manual refresh button
- ❌ If access not granted: Success page shows timeout actions, user can refresh

---

### Test 2: Credit Deduction Concurrency Simulation

**Objective:** Verify credit deduction is atomic and prevents double-charging

**Setup:**
1. Create test user with 10 credits
2. Set up 2 concurrent API calls to `/api/maya/generate-image`

**Steps:**
1. Start 2 simultaneous requests (Terminal 1 + Terminal 2)
2. Both should attempt to deduct 1 credit
3. Verify only 1 credit deducted total
4. Verify final balance is 9 (not 8)
5. Verify both requests complete (one succeeds, one waits)

**Expected Results:**
- ✅ First request: Atomic UPDATE succeeds, deducts 1 credit, balance = 9
- ✅ Second request: Atomic UPDATE succeeds (balance still >= 1), deducts 1 credit, balance = 8
- ✅ Both requests return success
- ✅ Total credits deducted: 2 (both requests succeed)
- ✅ Final balance: 8 (correct: 10 - 1 - 1 = 8)
- ✅ No race condition: Both UPDATEs use `WHERE balance >= amount`, ensuring atomicity
- ✅ No double-charging: Each UPDATE only succeeds if balance >= amount at time of execution

**Failure Scenarios:**
- ❌ If both deduct: Final balance = 8 (should be 9) → Race condition not fixed
- ❌ If transaction fails: Rollback occurs, balance unchanged, error returned

**Concurrency Test Script:**
```bash
# Run in 2 terminals simultaneously
# Terminal 1
curl -X POST http://localhost:3000/api/maya/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=..." \
  -d '{"conceptTitle":"Test1","category":"selfie"}'

# Terminal 2 (run immediately after Terminal 1)
curl -X POST http://localhost:3000/api/maya/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=..." \
  -d '{"conceptTitle":"Test2","category":"selfie"}'
```

**Verification:**
```sql
-- Check final balance
SELECT balance FROM user_credits WHERE user_id = 'test-user-id';

-- Check transaction count
SELECT COUNT(*) FROM credit_transactions 
WHERE user_id = 'test-user-id' 
AND transaction_type = 'image' 
AND created_at > NOW() - INTERVAL '1 minute';
```

---

### Test 3: Webhook Failure Simulation

**Objective:** Verify pending payment resolution works when userId cannot be resolved

**Steps:**
1. Create Stripe checkout session with email not in database
2. Complete payment (test mode)
3. Verify webhook processes but `userId` unresolved
4. Verify payment stored with `user_id=NULL, status='pending_resolution'`
5. Create user account with same email
6. Wait 5 minutes (cron job runs)
7. Verify payment resolved: `user_id` set, credits granted, subscription created

**Expected Results:**
- ✅ Webhook stores payment with `status='pending_resolution'`
- ✅ Cron job finds user by email
- ✅ Cron job grants 60 credits
- ✅ Cron job creates subscription
- ✅ Payment updated to `status='succeeded'`

**Manual Test:**
```sql
-- 1. Check pending payment
SELECT * FROM stripe_payments 
WHERE status = 'pending_resolution' 
AND product_type = 'paid_blueprint';

-- 2. Create user with email from payment metadata
INSERT INTO users (id, email, ...) VALUES (...);

-- 3. Wait 5 minutes, check if resolved
SELECT * FROM stripe_payments 
WHERE stripe_payment_id = 'payment-id-from-step-1';

-- 4. Verify credits granted
SELECT * FROM credit_transactions 
WHERE user_id = 'user-id-from-step-2' 
AND transaction_type = 'purchase' 
AND amount = 60;
```

---

### Test 4: Success Page Timeout Behavior

**Objective:** Verify success page handles slow webhooks gracefully

**Steps:**
1. Complete paid blueprint checkout
2. Artificially delay webhook (add 90s delay in webhook handler)
3. Navigate to success page
4. Observe polling behavior
5. Wait for timeout (120s)
6. Verify timeout actions appear
7. Click "Refresh Status" button
8. Verify polling resumes

**Expected Results:**
- ✅ Success page shows "Processing payment..." with progress bar
- ✅ Message updates: "Payment confirmed, granting access..." after 40s
- ✅ Timeout actions appear after 120s
- ✅ "Refresh Status" button resumes polling
- ✅ If webhook completes, access detected immediately on refresh

**Failure Scenarios:**
- ❌ If timeout too short: User redirected before webhook completes
- ❌ If no manual refresh: User stuck waiting
- ❌ If no progress indicator: User doesn't know how long to wait

---

## FINAL QUESTION: DEPLOYMENT READINESS

### After Implementing, Is the App:

**READY WITH MONITORING REQUIREMENTS** ⚠️

**Rationale:**
- All 3 blockers have surgical fixes with minimal risk
- Core functionality preserved
- Edge cases handled
- Rollback plans in place

**Monitoring Requirements:**
1. **Webhook Monitoring:**
   - Alert on `user_id_unresolved` errors
   - Monitor `stripe_payments` WHERE `status='pending_resolution'` count
   - Alert if pending payments > 10 after 1 hour

2. **Credit Deduction Monitoring:**
   - Alert on retry attempts (indicates concurrency)
   - Monitor for negative balances: `SELECT * FROM user_credits WHERE balance < 0`
   - Alert if retry failures > 5 per hour

3. **Success Page Monitoring:**
   - Track timeout rate (users who see timeout actions)
   - Monitor average webhook processing time
   - Alert if timeout rate > 10%

**Post-Deploy Verification:**
- Monitor webhook logs for 24 hours
- Check for pending payments: `SELECT COUNT(*) FROM stripe_payments WHERE status='pending_resolution'`
- Check for negative balances: `SELECT COUNT(*) FROM user_credits WHERE balance < 0`
- Track success page timeout rate

**If Monitoring Shows Issues:**
- Pending payments not resolving → Check cron job logs
- Negative balances → Check credit deduction logs, manually fix
- High timeout rate → Investigate webhook processing time

---

## IMPLEMENTATION ORDER

**Recommended Sequence:**
1. **Blocker 2 (Credit Deduction)** - Highest risk, most isolated
2. **Blocker 3 (Success Page)** - UI-only, easy to verify
3. **Blocker 1 (Webhook Resolution)** - Requires cron job setup

**Estimated Time:**
- Blocker 2: 2 hours (transaction logic + testing)
- Blocker 3: 1 hour (UI changes + testing)
- Blocker 1: 2 hours (webhook + cron job + testing)
- **Total: 5 hours**

---

**Plan End**
