# APPROVED IMPLEMENTATION PLAN — BLOCKERS ONLY

**Date:** 2025-01-XX  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Engineer:** Senior Engineer  
**Objective:** Fix 3 critical deployment blockers identified in audit  
**Estimated Time:** 5-6 hours  
**Risk Level:** Low (surgical fixes, minimal blast radius)

---

## EXECUTIVE SUMMARY

This plan addresses 3 critical blockers that must be fixed before deployment:

1. **Paid Blueprint Webhook User Resolution Failure** - Webhook returns 200 OK when userId cannot be resolved, user gets no credits/entitlement
2. **Credit Deduction Race Condition** - Concurrent requests can double-charge or create negative balances
3. **Success Page Polling Timeout** - 60s timeout may be insufficient, user sees stuck loading

All fixes are surgical, minimal-risk, and preserve existing functionality.

---

## A) CRON SCHEDULING PATTERN (VERIFIED)

**Current Pattern:** Cron jobs are scheduled in `vercel.json` using the following structure:

```json
{
  "crons": [
    {
      "path": "/api/cron/job-name",
      "schedule": "cron-pattern"
    }
  ]
}
```

**Authentication Pattern:** All cron routes verify `Authorization: Bearer ${CRON_SECRET}` header.

**Example from existing code:**
- `app/api/cron/admin-alerts/route.ts:28-40` - Standard auth pattern
- `app/api/cron/send-scheduled-campaigns/route.ts:22-32` - Standard auth pattern

**Schedule Format:** Standard cron syntax (e.g., `*/5 * * * *` for every 5 minutes)

---

## B) BLOCKER 1: PAID BLUEPRINT WEBHOOK USER RESOLUTION FAILURE

### Current Behavior

**File:** `app/api/webhooks/stripe/route.ts:1113-1127`

**Problem:** When `userId` cannot be resolved, webhook returns 200 OK but user gets no credits/entitlement. Payment stored with `user_id=NULL`, no retry mechanism.

### Exact Code Changes

#### Change 1: Update Webhook to Store Pending Payment and Exit Early

**File:** `app/api/webhooks/stripe/route.ts`

**Location:** Lines 1113-1127 (replace entire block)

**Current Code:**
```typescript
if (!userId && isPaymentPaid) {
  console.error(`[v0] ❌ CRITICAL: Cannot resolve user_id for paid blueprint purchase`, {
    customerEmail,
    sessionId: session.id,
    paymentIntentId,
    metadata: session.metadata,
  })
  return NextResponse.json({ 
    received: true, 
    error: "user_id_unresolved",
    message: "Payment succeeded but user_id could not be resolved" 
  }, { status: 200 })
}
```

**Replace With:**
```typescript
if (!userId && isPaymentPaid) {
  console.error(`[v0] ❌ CRITICAL: Cannot resolve user_id for paid blueprint purchase`, {
    customerEmail,
    sessionId: session.id,
    paymentIntentId,
    metadata: session.metadata,
  })
  
  // Store payment as pending resolution (payment already stored above, update status)
  try {
    await sql`
      UPDATE stripe_payments
      SET 
        status = 'pending_resolution',
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{unresolved_at}',
          to_jsonb(NOW()::text)
        )
      WHERE stripe_payment_id = ${paymentIdForStorage}
    `
    console.log(`[v0] ⚠️ Payment ${paymentIdForStorage} stored as pending_resolution`)
  } catch (updateError: any) {
    console.error(`[v0] Error updating payment status to pending_resolution:`, updateError.message)
  }
  
  // Return 200 OK (Stripe requirement) but do NOT continue processing
  return NextResponse.json({ 
    received: true, 
    error: "user_id_unresolved",
    message: "Payment succeeded but user_id could not be resolved. Will retry via cron job." 
  }, { status: 200 })
}
```

**CRITICAL RULE:** If userId unresolved → persist pending payment + exit. Do NOT attempt credits, subscriptions, or feed expansion.

#### Change 2: Create Cron Job for Pending Payments

**File:** `app/api/cron/resolve-pending-payments/route.ts` (NEW)

**Complete Implementation:**
```typescript
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { grantPaidBlueprintCredits } from "@/lib/credits"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/cron/resolve-pending-payments
 * 
 * Resolves pending paid blueprint payments where userId could not be resolved at webhook time.
 * Runs every 5 minutes.
 * 
 * Protected with CRON_SECRET verification
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (REQUIRED)
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

    console.log("[v0] [CRON] Starting pending payment resolution...")

    // Query pending payments (limit 50 per run to avoid timeout)
    const pendingPayments = await sql`
      SELECT 
        id,
        stripe_payment_id,
        metadata,
        created_at
      FROM stripe_payments
      WHERE status = 'pending_resolution'
        AND product_type = 'paid_blueprint'
      ORDER BY created_at ASC
      LIMIT 50
    `

    if (pendingPayments.length === 0) {
      console.log("[v0] [CRON] No pending payments to resolve")
      return NextResponse.json({ success: true, processed: 0 })
    }

    console.log(`[v0] [CRON] Found ${pendingPayments.length} pending payments to process`)

    let resolved = 0
    let failed = 0
    let skipped = 0

    for (const payment of pendingPayments) {
      try {
        // Payment-first idempotency check: if payment already processed, skip
        const existingProcessed = await sql`
          SELECT id FROM stripe_payments
          WHERE stripe_payment_id = ${payment.stripe_payment_id}
            AND status = 'succeeded'
            AND user_id IS NOT NULL
          LIMIT 1
        `
        
        if (existingProcessed.length > 0) {
          console.log(`[v0] [CRON] ⏭️ Payment ${payment.stripe_payment_id} already processed, skipping`)
          skipped++
          continue
        }

        // Extract customer email from metadata
        const customerEmail = payment.metadata?.customer_email
        if (!customerEmail) {
          console.error(`[v0] [CRON] ⚠️ Payment ${payment.stripe_payment_id} missing customer_email in metadata`)
          failed++
          continue
        }

        // Lookup user by email
        const [user] = await sql`
          SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
        `

        if (!user) {
          // User not found - increment retry count
          const retryCount = (payment.metadata?.retry_count || 0) + 1
          const lastRetryAt = new Date().toISOString()

          if (retryCount >= 24) {
            // Max retries reached - mark as failed
            await sql`
              UPDATE stripe_payments
              SET 
                status = 'failed_resolution',
                metadata = jsonb_set(
                  jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{retry_count}',
                    to_jsonb(${retryCount})
                  ),
                  '{last_retry_at}',
                  to_jsonb(${lastRetryAt})
                ),
                updated_at = NOW()
              WHERE id = ${payment.id}
            `
            console.error(`[v0] [CRON] ❌ Payment ${payment.stripe_payment_id} failed after ${retryCount} attempts`)
            failed++
          } else {
            // Increment retry count and update last_retry_at
            await sql`
              UPDATE stripe_payments
              SET 
                metadata = jsonb_set(
                  jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{retry_count}',
                    to_jsonb(${retryCount})
                  ),
                  '{last_retry_at}',
                  to_jsonb(${lastRetryAt})
                ),
                updated_at = NOW()
              WHERE id = ${payment.id}
            `
            console.log(`[v0] [CRON] ⏳ Payment ${payment.stripe_payment_id} retry ${retryCount}/24 (user not found)`)
          }
          continue
        }

        const userId = user.id

        // Secondary idempotency: Check if credits already granted for this payment
        const existingCredit = await sql`
          SELECT id FROM credit_transactions
          WHERE user_id = ${userId}
            AND stripe_payment_id = ${payment.stripe_payment_id}
            AND transaction_type = 'purchase'
          LIMIT 1
        `

        if (existingCredit.length > 0) {
          // Credits already granted - just update payment status
          await sql`
            UPDATE stripe_payments
            SET 
              user_id = ${userId},
              status = 'succeeded',
              updated_at = NOW()
            WHERE id = ${payment.id}
          `
          console.log(`[v0] [CRON] ⏭️ Payment ${payment.stripe_payment_id} credits already granted, updated status`)
          resolved++
          continue
        }

        // Grant credits (has idempotency check internally)
        const creditResult = await grantPaidBlueprintCredits(userId, payment.stripe_payment_id, false)
        
        if (!creditResult.success) {
          console.error(`[v0] [CRON] ⚠️ Failed to grant credits for payment ${payment.stripe_payment_id}: ${creditResult.error}`)
          failed++
          continue
        }

        // Create subscription entry (with idempotency check)
        const existingSubscription = await sql`
          SELECT id FROM subscriptions
          WHERE user_id = ${userId}
            AND product_type = 'paid_blueprint'
            AND status = 'active'
          LIMIT 1
        `

        if (existingSubscription.length === 0) {
          try {
            await sql`
              INSERT INTO subscriptions (
                user_id,
                product_type,
                plan,
                status,
                created_at,
                updated_at
              )
              VALUES (
                ${userId},
                'paid_blueprint',
                'paid_blueprint',
                'active',
                NOW(),
                NOW()
              )
            `
          } catch (insertError: any) {
            if (insertError.code !== '23505') {
              throw insertError
            }
            // Subscription already exists (race condition) - OK
          }
        }

        // Update blueprint_subscribers (if exists)
        await sql`
          UPDATE blueprint_subscribers
          SET 
            paid_blueprint_purchased = TRUE,
            user_id = ${userId},
            updated_at = NOW()
          WHERE email = ${customerEmail}
        `

        // Update payment status
        await sql`
          UPDATE stripe_payments
          SET 
            user_id = ${userId},
            status = 'succeeded',
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{resolved_at}',
              to_jsonb(NOW()::text)
            ),
            updated_at = NOW()
          WHERE id = ${payment.id}
        `

        console.log(`[v0] [CRON] ✅ Resolved payment ${payment.stripe_payment_id} for user ${userId}`)
        resolved++

      } catch (error: any) {
        console.error(`[v0] [CRON] ❌ Error processing payment ${payment.stripe_payment_id}:`, error.message)
        failed++
      }
    }

    console.log(`[v0] [CRON] Completed: ${resolved} resolved, ${failed} failed, ${skipped} skipped`)

    return NextResponse.json({
      success: true,
      processed: pendingPayments.length,
      resolved,
      failed,
      skipped,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in resolve-pending-payments cron:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve pending payments" },
      { status: 500 }
    )
  }
}
```

#### Change 3: Add Cron Job to vercel.json

**File:** `vercel.json`

**Location:** Add to `crons` array (after line 62, before closing bracket)

**Add:**
```json
    {
      "path": "/api/cron/resolve-pending-payments",
      "schedule": "*/5 * * * *"
    }
```

**Final vercel.json structure:**
```json
{
  "crons": [
    ...existing cron jobs...,
    {
      "path": "/api/cron/resolve-pending-payments",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Verification Checklist

- [ ] Webhook stores payment with `status='pending_resolution'` when userId unresolved
- [ ] Webhook returns 200 OK immediately (does not continue processing)
- [ ] Cron job authenticates with `CRON_SECRET`
- [ ] Cron job increments `retry_count` in metadata
- [ ] Cron job stores `last_retry_at` in metadata
- [ ] Cron job marks as `failed_resolution` after 24 attempts
- [ ] Payment-first idempotency: skips if payment already `succeeded` with `user_id`
- [ ] Secondary idempotency: checks `credit_transactions` before granting credits
- [ ] Cron job grants 60 credits when user found
- [ ] Cron job creates subscription entry
- [ ] Cron job updates `blueprint_subscribers`

---

## C) BLOCKER 2: CREDIT DEDUCTION RACE CONDITION

### Current Behavior

**File:** `lib/credits.ts:221-310`

**Problem:** Read balance → check → update pattern without atomicity. Concurrent requests can both read same balance, both pass check, both deduct → double charge or negative balance.

### Exact Code Changes

#### Change: Replace with Atomic UPDATE

**File:** `lib/credits.ts`

**Location:** Lines 248-310 (replace entire `deductCredits` function body after line 246)

**Current Code:**
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

**Replace With:**
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
    // Optimistic check (not locked, but helps avoid unnecessary UPDATE attempts)
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
    // This is rare but possible. Mitigation: Log error prominently, repair tool available
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
        referenceId,
      })
      // Continue - credits are deducted, user can use them
      // Admin can repair transaction log later using repair tool
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

### Reconciliation/Repair Tool

**File:** `scripts/repair-missing-credit-transactions.ts` (NEW)

**Purpose:** Reconcile cases where UPDATE succeeded but INSERT failed (credits deducted, no transaction log)

**Implementation:**
```typescript
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Repair Tool: Reconcile Missing Credit Transactions
 * 
 * Finds cases where user_credits.balance doesn't match sum of credit_transactions
 * and creates missing transaction logs.
 * 
 * Usage: npx tsx scripts/repair-missing-credit-transactions.ts
 */
async function repairMissingTransactions() {
  console.log("[REPAIR] Starting credit transaction reconciliation...")

  // Find discrepancies: balance doesn't match transaction sum
  const discrepancies = await sql`
    SELECT 
      uc.user_id,
      uc.balance as current_balance,
      COALESCE(SUM(ct.amount), 0) as transaction_sum,
      (uc.balance - COALESCE(SUM(ct.amount), 0)) as difference
    FROM user_credits uc
    LEFT JOIN credit_transactions ct ON uc.user_id = ct.user_id
    GROUP BY uc.user_id, uc.balance
    HAVING uc.balance != COALESCE(SUM(ct.amount), 0)
    ORDER BY ABS(uc.balance - COALESCE(SUM(ct.amount), 0)) DESC
    LIMIT 100
  `

  if (discrepancies.length === 0) {
    console.log("[REPAIR] ✅ No discrepancies found")
    return
  }

  console.log(`[REPAIR] Found ${discrepancies.length} discrepancies`)

  let repaired = 0
  let errors = 0

  for (const disc of discrepancies) {
    try {
      const difference = Number(disc.difference)
      
      if (difference === 0) continue

      // Create reconciliation transaction
      await sql`
        INSERT INTO credit_transactions (
          user_id,
          amount,
          transaction_type,
          description,
          balance_after,
          created_at
        )
        VALUES (
          ${disc.user_id},
          ${difference},
          'refund',
          'Reconciliation: Missing transaction log repaired',
          ${disc.current_balance},
          NOW()
        )
      `

      console.log(`[REPAIR] ✅ Repaired user ${disc.user_id}: ${difference > 0 ? '+' : ''}${difference} credits`)
      repaired++
    } catch (error: any) {
      console.error(`[REPAIR] ❌ Error repairing user ${disc.user_id}:`, error.message)
      errors++
    }
  }

  console.log(`[REPAIR] Completed: ${repaired} repaired, ${errors} errors`)
}

repairMissingTransactions().catch(console.error)
```

**Alternative SQL-Only Version:** `scripts/repair-missing-credit-transactions.sql`
```sql
-- Repair Tool: Reconcile Missing Credit Transactions
-- Finds cases where user_credits.balance doesn't match sum of credit_transactions
-- and creates missing transaction logs.

BEGIN;

-- Find and repair discrepancies
INSERT INTO credit_transactions (
  user_id,
  amount,
  transaction_type,
  description,
  balance_after,
  created_at
)
SELECT 
  uc.user_id,
  (uc.balance - COALESCE(SUM(ct.amount), 0)) as difference,
  'refund',
  'Reconciliation: Missing transaction log repaired',
  uc.balance,
  NOW()
FROM user_credits uc
LEFT JOIN credit_transactions ct ON uc.user_id = ct.user_id
GROUP BY uc.user_id, uc.balance
HAVING uc.balance != COALESCE(SUM(ct.amount), 0)
  AND (uc.balance - COALESCE(SUM(ct.amount), 0)) != 0;

COMMIT;
```

### Verification Checklist

- [ ] Atomic UPDATE uses `WHERE balance >= amount` condition
- [ ] UPDATE returns 0 rows if balance insufficient
- [ ] Retry logic handles concurrent updates (max 3 attempts)
- [ ] INSERT failure after UPDATE is logged prominently
- [ ] Test: 2 concurrent requests → both succeed, 2 credits deducted total
- [ ] Test: Insufficient credits → returns error, no deduction
- [ ] Repair tool can identify and fix missing transaction logs

---

## D) BLOCKER 3: SUCCESS PAGE POLLING TIMEOUT

### Current Behavior

**File:** `components/checkout/success-content.tsx:76-189`

**Problem:** 60-second timeout may be insufficient if webhook is slow. User redirected without access, sees confusing state.

### Exact Code Changes

#### Change 1: Increase Timeout

**File:** `components/checkout/success-content.tsx`

**Location:** Line 79

**Current:**
```typescript
const MAX_POLL_ATTEMPTS = 30 // 30 attempts × 2s = 60s timeout
```

**Replace With:**
```typescript
const MAX_POLL_ATTEMPTS = 60 // 60 attempts × 2s = 120s timeout
```

#### Change 2: Add User-Facing Progress UI

**File:** `components/checkout/success-content.tsx`

**Location:** After line 78, add new state

**Add:**
```typescript
const [pollingMessage, setPollingMessage] = useState("Processing your payment...")
const [timeRemaining, setTimeRemaining] = useState(120)
const [showTimeoutActions, setShowTimeoutActions] = useState(false)
```

#### Change 3: Update Polling Logic

**File:** `components/checkout/success-content.tsx`

**Location:** Lines 156-167 (replace timeout handling)

**Current:**
```typescript
if (pollAttempts >= MAX_POLL_ATTEMPTS) {
  // Timeout - redirect anyway, user can refresh
  console.log('[SUCCESS PAGE] Polling timeout, redirecting anyway...')
  setIsPollingAccess(false)
  setTimeout(() => {
    router.push('/feed-planner?purchase=success&refresh=needed')
  }, 500)
}
```

**Replace With:**
```typescript
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
```

#### Change 4: Add UI Components

**File:** `components/checkout/success-content.tsx`

**Location:** At top of file, add imports

**Add:**
```typescript
import { Button } from "@/components/ui/button"
import LoadingSpinner from "@/components/sselfie/loading-spinner"
```

**Location:** Before main return statement (around line 190), add UI components

**Add:**
```typescript
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

### Verification Checklist

- [ ] Timeout increased to 120 seconds
- [ ] Progress indicator shows polling status
- [ ] Message updates based on progress
- [ ] Timeout actions appear after 120s
- [ ] "Refresh Status" button resumes polling
- [ ] "Continue to Feed Planner" button redirects correctly
- [ ] Uses existing `Button` and `LoadingSpinner` components

---

## E) COMPLETE VERIFICATION CHECKLIST

### Pre-Deploy Verification

**Blocker 1:**
- [ ] Webhook stores `pending_resolution` when userId unresolved
- [ ] Webhook exits early (does not continue processing)
- [ ] Cron job added to `vercel.json`
- [ ] Cron job authenticates with `CRON_SECRET`
- [ ] Cron job increments `retry_count` in metadata
- [ ] Cron job stores `last_retry_at` in metadata
- [ ] Cron job marks `failed_resolution` after 24 attempts
- [ ] Payment-first idempotency works (skips if already processed)
- [ ] Secondary idempotency works (checks credit_transactions)

**Blocker 2:**
- [ ] Atomic UPDATE uses `WHERE balance >= amount`
- [ ] Retry logic handles concurrent updates
- [ ] INSERT failure after UPDATE is logged
- [ ] Test: 2 concurrent requests → 2 credits deducted (correct)
- [ ] Test: Insufficient credits → error returned

**Blocker 3:**
- [ ] Timeout increased to 120s
- [ ] Progress indicator works
- [ ] Timeout actions appear correctly
- [ ] Uses existing UI components

### Post-Deploy Verification

**Manual Tests:**
1. Paid blueprint checkout with new email → Payment stored as `pending_resolution`
2. Create user with same email → Cron job resolves within 5 minutes
3. Check `stripe_payments` → Payment updated with `user_id` and `status='succeeded'`
4. Check `credit_transactions` → 60 credits granted
5. Check `subscriptions` → Paid blueprint subscription created
6. Concurrent credit deductions → Both succeed, correct total deducted
7. Success page polling → Shows progress, timeout actions work

**Monitoring:**
- [ ] Check for `pending_resolution` payments: `SELECT COUNT(*) FROM stripe_payments WHERE status='pending_resolution'`
- [ ] Check for `failed_resolution` payments: `SELECT COUNT(*) FROM stripe_payments WHERE status='failed_resolution'`
- [ ] Check for missing transaction logs: Run repair tool
- [ ] Monitor cron job logs for errors

---

## F) FILES MODIFIED SUMMARY

**Modified Files:**
1. `app/api/webhooks/stripe/route.ts` (lines 1113-1127)
2. `lib/credits.ts` (lines 248-310)
3. `components/checkout/success-content.tsx` (lines 79, 78-189, imports, UI components)
4. `vercel.json` (add cron job)

**New Files:**
1. `app/api/cron/resolve-pending-payments/route.ts`
2. `scripts/repair-missing-credit-transactions.ts` (or `.sql`)

**Total Changes:** 4 files modified, 2 files created

---

## G) ROLLBACK PROCEDURE

If issues occur after deployment:

1. **Blocker 1:** Revert webhook changes, disable cron job in `vercel.json`, manually resolve pending payments
2. **Blocker 2:** Revert `lib/credits.ts` to original, run repair tool to fix any discrepancies
3. **Blocker 3:** Revert `components/checkout/success-content.tsx` to original

**Emergency SQL Fixes:**
```sql
-- Fix pending payments manually
UPDATE stripe_payments 
SET status='succeeded', user_id=(SELECT id FROM users WHERE email=metadata->>'customer_email')
WHERE status='pending_resolution' AND user_id IS NULL;

-- Fix missing transaction logs (run repair tool)
-- See scripts/repair-missing-credit-transactions.ts
```

---

**Plan End - Ready for Implementation**
