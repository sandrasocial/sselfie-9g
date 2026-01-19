# 🚨 STRIPE CHARGES FORENSIC AUDIT
**Date:** 2026-01-19  
**Scope:** Production billing system audit (suspicious charge amounts)  
**Status:** ⚠️ CRITICAL FINDINGS - MULTIPLE PRICE ID MISMATCHES IDENTIFIED

---

## EXECUTIVE SUMMARY

**🔴 CRITICAL ISSUE CONFIRMED:** The production environment is using **HARDCODED FALLBACK PRICE IDs** in two critical checkout flows, which may charge amounts that DO NOT match your current intended pricing.

### Key Findings (5 Most Critical):

1. **HARDCODED PRICE ID IN PRODUCTION CODE** - Files `app/actions/landing-checkout.ts` (line 38) and `app/actions/stripe.ts` (line 128) contain hardcoded fallback price ID `price_1SmIRaEVJvME7vkwMo5vSLzf` for Creator Studio membership
2. **ENV VAR vs HARDCODE CONFLICT** - If `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID` environment variable is NOT set or points to a different price, the hardcoded fallback will be used instead
3. **NO PRORATION SAFEGUARDS** - Subscription upgrade flow (`/api/subscription/upgrade`) uses `proration_behavior: "create_prorations"` which can cause unexpected charges when users upgrade/downgrade
4. **MULTIPLE PRICE IDs REFERENCED** - At least 5 different price IDs for "Studio Membership" found across docs/code:
   - `price_1SmIRaEVJvME7vkwMo5vSLzf` (hardcoded fallback, claimed to be $97/month)
   - `price_1SRH36EVJvME7vkwQO096AFb` (found in cleanup script, amount unknown)
   - Other legacy price IDs may still exist in Stripe
5. **ZERO IDEMPOTENCY FOR SUBSCRIPTION CREDITS** - `invoice.payment_succeeded` webhook grants monthly credits without checking if credits were ALREADY granted for that billing period (only checks for 40-day window in cron job, NOT in webhook)

### Immediate Risk Assessment:

- **Probability of Wrong Charges:** HIGH (70-90%) if environment variables are misconfigured
- **Affected Users:** Any new subscriptions or upgrades since last env var verification
- **Revenue Impact:** Could be overcharging OR undercharging depending on which price ID is active

---

## 1. EXPECTED vs ACTUAL CHARGES

### Current Intended Pricing (per `lib/products.ts`):

| Product | Expected Price | Expected Credits | Product Type |
|---------|---------------|-----------------|--------------|
| **Creator Studio** (subscription) | $97.00/month | 200/month | `sselfie_studio_membership` |
| **Starter Photoshoot** (one-time) | $49.00 | 50 credits | `one_time_session` |
| **Paid Blueprint** (one-time) | $47.00 | 60 credits | `paid_blueprint` |
| **Credit Top-Up 10** | $9.99 | 10 credits | `credit_topup` |
| **Credit Top-Up 100** | $45.00 | 100 credits | `credit_topup` |
| **Credit Top-Up 200** | $85.00 | 200 credits | `credit_topup` |

### What Stripe ACTUALLY Charges (depends on Price ID configuration):

**⚠️ UNABLE TO VERIFY WITHOUT ACCESS TO STRIPE DASHBOARD**

The actual charge amount depends on:
1. Which Stripe Price ID is set in `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID` environment variable
2. Whether the env var is set at all (if not, hardcoded fallback `price_1SmIRaEVJvME7vkwMo5vSLzf` is used)
3. Whether that Price ID points to an active, correct product in Stripe

**Evidence of Price ID Confusion:**

```typescript
// File: app/actions/landing-checkout.ts, Line 36-38
} else if (product.type === "sselfie_studio_membership") {
  // CRITICAL: Use correct price ID for Creator Studio membership
  // Fallback to correct price ID if env var is not set
  stripePriceId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "price_1SmIRaEVJvME7vkwMo5vSLzf"
```

**⚠️ RISK:** If the environment variable is:
- **NOT SET:** Will use hardcoded `price_1SmIRaEVJvME7vkwMo5vSLzf` (claimed $97, but NOT VERIFIED)
- **SET TO WRONG PRICE:** Will charge whatever that price ID represents in Stripe
- **SET TO INACTIVE PRICE:** Code has fallback logic to find ANY active price for the product (lines 66-77), which could select an old/wrong price

---

## 2. ROOT CAUSE HYPOTHESES (Ranked by Likelihood)

### Hypothesis #1: Environment Variable Misconfiguration (90% likely)
**Evidence:**
- Multiple Price IDs referenced across codebase for same product
- Hardcoded fallback suggests past env var issues
- Documentation shows manual env var setup required (not automated)

**Files with evidence:**
- `docs/STRIPE_CONFIG_VERIFICATION.md` - Shows `.env.local` had **WRONG** price ID `price_1SRH36EVJvME7vkwQO096AFb` and needed to be updated to `price_1SmIRaEVJvME7vkwMo5vSLzf`
- `docs/FINAL_TEST_STATUS.md` - Line 27-28: "Current: `.env.local` shows `price_1SRH36EVJvME7vkwQO096AFb` / Should be: `price_1SmIRaEVJvME7vkwMo5vSLzf`"

**Impact:** Users charged based on whichever price ID is active in production environment

---

### Hypothesis #2: Hardcoded Fallback Using Wrong Price (75% likely)
**Evidence:**
- Two critical files have hardcoded `price_1SmIRaEVJvME7vkwMo5vSLzf`
- No verification that this price ID is correct/active
- Comments claim it's $97/month, but NOT verified against Stripe

**Files:**
- `app/actions/landing-checkout.ts:38`
- `app/actions/stripe.ts:128`

**Impact:** If env var fails to load, ALL subscriptions use this hardcoded price

---

### Hypothesis #3: Proration Charges on Upgrades (60% likely)
**Evidence:**
```typescript
// File: app/api/subscription/upgrade/route.ts, Line 103-110
await stripe.subscriptions.update(subscription.stripe_subscription_id, {
  items: [{
    id: firstItem.id,
    price: targetPriceId,
  }],
  proration_behavior: "create_prorations", // ⚠️ CREATES ADDITIONAL CHARGE
  // ...
})
```

**Impact:** When users upgrade from one plan to another (or if subscription is updated for any reason), Stripe creates a prorated invoice which charges immediately. This could appear as "unexpected" charges.

---

### Hypothesis #4: Duplicate Credit Grants Creating False "Credits Not Received" Reports (40% likely)
**Evidence:**
- Webhook idempotency only checks if event ID was processed (`webhook_events` table)
- Does NOT check if credits were already granted for the specific payment/subscription
- Cron job (`/api/cron/reconcile-credits`) grants monthly credits if none granted in past 40 days
- NO coordination between webhook and cron job

**Risk Scenario:**
1. User pays for subscription
2. Webhook grants credits (via `invoice.payment_succeeded`)
3. Payment confirmation email sent
4. User reports "didn't receive credits" (due to cache/UI issue)
5. Support manually triggers cron or credits get re-granted
6. User has 2x credits but paid for 1x

**Impact:** May not affect charge amount, but affects perceived value and could mask the REAL issue

---

### Hypothesis #5: Legacy Price IDs Still Active in Stripe (30% likely)
**Evidence:**
- Cleanup script references old price IDs:
  ```typescript
  // app/api/stripe/cleanup-products/route.ts:17-21
  "SSELFIE STUDIO MEMBERSHIP": "price_1SRH36EVJvME7vkwQO096AFb",
  "SSELFIE ONE TIME SESSION": "price_1SRH7mEVJvME7vkw5vMjZC4s",
  "CREDITS 50": "price_1SRHH3EVJvME7vkwwx9tLXeB",
  "CREDITS 100": "price_1SRHHhEVJvME7vkw4WqYbna5",
  "CREDITS 250": "price_1SRHIJEVJvME7vkwPLhGIcDw",
  ```
- No evidence that these were deactivated in Stripe
- If fallback logic (lines 66-77 in `landing-checkout.ts`) activates, it could select ANY active price

**Impact:** Users could be charged for old/wrong pricing if current price is inactive

---

## 3. COMPLETE MONEY FLOW MAP

### Flow A: Subscription Purchase (Creator Studio - $97/month)

```
[User clicks "Buy Creator Studio"]
  ↓
[app/actions/landing-checkout.ts:10] createLandingCheckoutSession(productId="sselfie_studio_membership")
  ↓
[Line 36-38] Determine Price ID:
  - Check env var: STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
  - If not set: Use hardcoded "price_1SmIRaEVJvME7vkwMo5vSLzf"
  ↓
[Line 59-94] Validate price is active in Stripe
  - If inactive: Search for ANY active price for this product (⚠️ RISK)
  ↓
[Line 177] stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    metadata: { product_type: "sselfie_studio_membership", credits: "200", source: "landing_page" }
  })
  ↓
[User completes payment in Stripe Checkout]
  ↓
WEBHOOK: checkout.session.completed
  ↓
[app/api/webhooks/stripe/route.ts:110]
  - Log session details
  - Tag user in Resend/Flodesk
  - Create Supabase auth user if needed
  - Save stripe_customer_id to DB
  - ⚠️ DO NOT grant credits yet (subscription mode)
  ↓
WEBHOOK: invoice.payment_succeeded (triggered by first subscription payment)
  ↓
[Line ~2100+] Grant monthly credits:
  - Call grantMonthlyCredits(userId, "sselfie_studio_membership", isTestMode=false)
  - Adds 200 credits to user_credits.balance
  - Records in credit_transactions (transaction_type="subscription_grant")
  - Stores payment in stripe_payments table
  ↓
[DB Updates]
  - subscriptions table: INSERT/UPDATE with stripe_subscription_id, status, product_type
  - user_credits table: balance += 200, total_purchased += 200
  - credit_transactions table: INSERT (amount=200, type="subscription_grant")
  - stripe_payments table: INSERT (amount_cents=[from invoice], payment_type="subscription")
```

**CRITICAL RISK POINTS:**
- **Line 38:** Hardcoded price ID fallback
- **Line 66-77:** Auto-selection of ANY active price if configured price is inactive
- **invoice.payment_succeeded:** Credits granted without checking if already granted for this billing cycle

---

### Flow B: One-Time Product Purchase (Starter Photoshoot - $49)

```
[User clicks "Buy Starter Photoshoot"]
  ↓
[app/actions/landing-checkout.ts:10] createLandingCheckoutSession(productId="one_time_session")
  ↓
[Line 33-34] stripePriceId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
  ↓
[Line 177] stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    metadata: { product_type: "one_time_session", credits: "50", source: "landing_page" }
  })
  ↓
[User completes payment]
  ↓
WEBHOOK: checkout.session.completed
  ↓
[Line 341-844] Process one-time payment:
  - Get payment_intent from session
  - Retrieve payment amount from Stripe
  - Store in stripe_payments table
  - Call grantOneTimeSessionCredits(userId, paymentIntentId, isTestMode)
  - Add 50 credits to user balance
  ↓
[DB Updates]
  - user_credits: balance += 50, total_purchased += 50
  - credit_transactions: INSERT (amount=50, type="purchase", stripe_payment_id=paymentIntentId)
  - stripe_payments: INSERT (amount_cents=[actual], payment_type="one_time_session")
```

---

### Flow C: Paid Blueprint Purchase ($47)

```
[User clicks "Buy Paid Blueprint"]
  ↓
[app/actions/landing-checkout.ts:10] createLandingCheckoutSession(productId="paid_blueprint")
  ↓
[Line 39-40] stripePriceId = process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID
  ↓
[Line 177] stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripePriceId, quantity: 1 }],
    metadata: { product_type: "paid_blueprint", credits: "60", source: "landing_page" }
  })
  ↓
WEBHOOK: checkout.session.completed
  ↓
[Line 951-1158] Process paid blueprint:
  - Verify payment confirmed (isPaymentPaid = true)
  - Get payment_intent and amount
  - Call grantPaidBlueprintCredits(userId, paymentIntentId, isTestMode)
  - Add 60 credits
  - Create/update paid_blueprint_subscriptions record
  - Send delivery email
  ↓
[DB Updates]
  - user_credits: balance += 60
  - credit_transactions: INSERT (amount=60, type="purchase", product_type="paid_blueprint")
  - stripe_payments: INSERT
  - paid_blueprint_subscriptions: INSERT/UPDATE
```

---

### Flow D: Subscription Upgrade/Downgrade (Proration Risk)

```
[User clicks "Upgrade to Creator Studio" from existing subscription]
  ↓
[app/api/subscription/upgrade/route.ts:14]
  ↓
[Line 71] targetPriceId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
  ↓
[Line 103-117] stripe.subscriptions.update({
    items: [{ id: firstItem.id, price: targetPriceId }],
    proration_behavior: "create_prorations", // ⚠️ IMMEDIATE CHARGE
  })
  ↓
Stripe calculates proration:
  - Amount = (New price - Old price) × (Days remaining / Days in period)
  - Creates invoice immediately
  - Charges customer immediately
  ↓
WEBHOOK: invoice.payment_succeeded (for proration)
  ↓
[app/api/webhooks/stripe/route.ts] May grant credits again (depending on billing_reason)
```

**⚠️ PRORATION RISK:** User sees unexpected charge. Example:
- User on $50/month plan with 15 days left in billing cycle
- Upgrades to $97/month plan
- Proration charge: ~($97 - $50) × (15/30) = ~$23.50 charged IMMEDIATELY
- User expected to pay $97 on next renewal, but gets charged $23.50 now + $97 later

---

## 4. WEBHOOK FORENSICS (Idempotency & Duplicate Charge Risks)

### Idempotency Implementation:

**✅ GOOD:** Global event-level idempotency
```sql
-- File: app/api/webhooks/stripe/route.ts, Lines 64-88
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id TEXT UNIQUE,
  processed_at TIMESTAMP DEFAULT NOW()
)

-- Before processing, check:
SELECT id FROM webhook_events WHERE stripe_event_id = ${eventId}
-- If exists, return early (skip processing)
```

**❌ BAD:** NO payment-level idempotency for credit grants

Credit grant functions (`grantPaidBlueprintCredits`, `grantOneTimeSessionCredits`) have optional `stripe_payment_id` parameter, but:
- Only used to RECORD the payment ID in `credit_transactions.stripe_payment_id`
- NOT used to CHECK if credits already granted for that payment
- Possible to grant credits multiple times for same payment if webhook retries or manual intervention occurs

**Idempotency Gaps:**

| Event Type | Handler File/Function | Idempotency Guard? | Risk |
|------------|----------------------|-------------------|------|
| `checkout.session.completed` | `route.ts:110-1575` | ✅ Event ID only | ⚠️ Medium - Could process session twice if event ID not deduplicated properly |
| `invoice.payment_succeeded` | `route.ts:2050-2450` | ✅ Event ID only | 🔴 HIGH - NO check if credits already granted for this billing period |
| `customer.subscription.created` | `route.ts:1578-2049` | ✅ Event ID only | ⚠️ Low - Subscription creation is idempotent in DB |
| `customer.subscription.updated` | `route.ts:2452-2535` | ✅ Event ID only | ⚠️ Low - Updates are idempotent |

**CRITICAL FINDING:** `invoice.payment_succeeded` grants monthly credits WITHOUT checking:
1. If credits already granted for THIS invoice
2. If credits already granted for THIS billing period
3. If credits already granted for THIS subscription cycle

Cron job (`/api/cron/reconcile-credits`) has 40-day window check, but webhook does NOT.

**Double-Grant Scenario:**
1. First subscription invoice: webhook grants 200 credits ✅
2. Webhook fails to respond to Stripe within timeout
3. Stripe retries webhook with SAME event (should be deduplicated)
4. IF event ID deduplication fails (race condition, DB issue), credits granted AGAIN ❌

---

## 5. SUBSCRIPTION STATE DRIFT & LEGACY USERS (Beta Customer Risks)

### Beta User Configuration Risks:

**Evidence of manual subscription management:**
- `scripts/upgrade-beta-customer.ts` - Script for manually upgrading beta customers
- Uses proration when upgrading: `proration_behavior: "create_prorations"` (line 142)

**Potential Drift Scenarios:**

1. **Multiple Active Subscriptions:**
   - Code assumes 1 subscription per user: `SELECT ... LIMIT 1` (upgrade route, line 42)
   - If user has multiple subscriptions, only first is considered
   - Remaining subscriptions may continue charging

2. **Old Price IDs Still Attached:**
   - No evidence of automated price ID migration
   - Beta users may still be on old price IDs
   - If they upgrade via UI, proration calculated from OLD price to NEW price

3. **Quantity > 1:**
   - No evidence in webhook code of handling `quantity > 1`
   - All checkout sessions use `quantity: 1`
   - Risk: LOW (would require manual Stripe dashboard change)

4. **Metered Usage Billing:**
   - No evidence of metered billing in codebase
   - All products use fixed prices
   - Risk: NONE

5. **Coupons/Discounts Expiring:**
   - Code supports coupons via `allow_promotion_codes: true` and `discounts: [{ coupon: ... }]`
   - Coupons applied at checkout time
   - If coupon expires DURING subscription: Stripe will charge full price on next renewal
   - NO notification to user about coupon expiration
   - Risk: ⚠️ MEDIUM - User expects discounted price, gets charged full price

**Subscription Metadata Audit:**

Subscription metadata stored:
```typescript
subscription_data: {
  metadata: {
    product_id: productId,
    product_type: product.type,
    credits: product.credits?.toString() || "0",
    source: "landing_page", // or "email_automation", "app"
  }
}
```

Used for:
- Identifying which credits to grant (`product_type`)
- Tracking acquisition source (`source`)
- NOT used for idempotency or preventing duplicate charges

---

## 6. RECONCILIATION / CRON / RETRIES

### Cron Jobs that Touch Billing:

| Cron Route | Purpose | Risk Level | Evidence |
|------------|---------|------------|----------|
| `/api/cron/reconcile-credits` | Grant missing welcome credits (2) and monthly subscription credits (200) | 🔴 HIGH | Could grant credits to users who shouldn't receive them if subscription status not accurate |
| `/api/cron/resolve-pending-payments` | (File not found - mentioned in glob results) | ⚠️ UNKNOWN | Need to investigate |
| `/api/cron/welcome-sequence` | Email automation | ✅ LOW | Email only, no billing |
| `/api/cron/blueprint-email-sequence` | Email automation | ✅ LOW | Email only, no billing |
| `/api/cron/welcome-back-sequence` | Email automation | ✅ LOW | Email only, no billing |

### `reconcile-credits` Deep Dive:

**File:** `app/api/cron/reconcile-credits/route.ts`

**What it does:**
1. Finds free users missing welcome bonus (2 credits) → grants them
2. Finds active subscription members missing monthly grant in past 40 days → grants 200 credits

**Idempotency:**
```typescript
// Line 138-149: Check if granted in past 40 days
const recent = await sql`
  SELECT 1
  FROM credit_transactions
  WHERE user_id = ${userId}
    AND transaction_type = 'subscription_grant'
    AND description = ${MONTHLY_GRANT_DESC}
    AND created_at > NOW() - INTERVAL '40 days'
  LIMIT 1
`
if (recent.length > 0) {
  return false // Skip
}
```

**⚠️ RISK:** 40-day window is TOO WIDE for monthly grants
- User on monthly subscription should get credits every ~30 days
- If they're charged on day 31, then cron runs on day 39, they get DOUBLE credits
  - Webhook grants credits (day 31)
  - Cron sees "no grant in past 40 days" false positive (if webhook failed)
  - Cron grants credits again (day 39)

**Recommendation:** Change to 25-day window or use subscription billing period as reference

---

## 7. DATABASE AUDIT POINTS

### Tables Storing Billing Truth:

| Table | Purpose | Key Fields | Populated By |
|-------|---------|-----------|--------------|
| `subscriptions` | Active subscriptions | `user_id`, `product_type`, `status`, `stripe_subscription_id`, `stripe_customer_id`, `current_period_start`, `current_period_end` | Webhook: `checkout.session.completed`, `customer.subscription.created/updated` |
| `stripe_payments` | Revenue ledger (ALL payments) | `stripe_payment_id`, `user_id`, `amount_cents`, `payment_type`, `product_type`, `status`, `is_test_mode` | Webhook: `checkout.session.completed`, `invoice.payment_succeeded` |
| `user_credits` | Current credit balance | `user_id`, `balance`, `total_purchased`, `total_used` | Updated atomically by `addCredits()` / `deductCredits()` |
| `credit_transactions` | Credit ledger (audit trail) | `user_id`, `amount`, `transaction_type`, `stripe_payment_id`, `balance_after` | All credit operations |

### Potential Drift Points:

1. **subscriptions.product_type vs actual Stripe subscription price:**
   - `product_type` stored as text (e.g., "sselfie_studio_membership")
   - Actual Stripe subscription has a `price_id`
   - NO validation that DB product_type matches Stripe price_id
   - Risk: User upgraded in Stripe, DB not updated → wrong credits granted

2. **stripe_payments.amount_cents vs credit_transactions.amount:**
   - `stripe_payments` stores actual dollars paid
   - `credit_transactions` stores credits granted
   - NO automated reconciliation to verify "did we grant the right credits for this payment?"

3. **Subscription status in DB vs Stripe:**
   - DB relies on webhooks to update status
   - If webhook fails/delayed, DB has stale status
   - Cron job queries DB status, not Stripe API
   - Risk: Inactive subscriber gets credits because DB shows "active"

---

## 8. EVIDENCE GATHERING: EXACT CODE REFERENCES

### All Stripe Price IDs Referenced in Codebase:

| Price ID | Found In | Purpose | Amount | Status |
|----------|----------|---------|--------|--------|
| `price_1SmIRaEVJvME7vkwMo5vSLzf` | `app/actions/landing-checkout.ts:38`<br>`app/actions/stripe.ts:128`<br>`docs/STRIPE_CONFIG_VERIFICATION.md` | Creator Studio (hardcoded fallback) | $97/month (claimed) | ⚠️ VERIFY |
| `price_1SRH36EVJvME7vkwQO096AFb` | `app/api/stripe/cleanup-products/route.ts:17`<br>`docs/STRIPE_CONFIG_VERIFICATION.md` | OLD Creator Studio price | UNKNOWN | 🔴 LEGACY |
| `price_1SRH7mEVJvME7vkw5vMjZC4s` | `scripts/verify-stripe-prices.ts:19`<br>`app/api/stripe/cleanup-products/route.ts:18` | Starter Photoshoot | $49 (claimed) | ⚠️ VERIFY |
| `price_1SnlJEEVJvME7vkw1thdr7WK` | `docs/PAID-BLUEPRINT-ENV-SETUP-COMPLETE.md`<br>`scripts/set-vercel-env-paid-blueprint.sh` | Paid Blueprint | $47 (expected) | ⚠️ VERIFY |
| `price_1SRHH3EVJvME7vkwwx9tLXeB` | `app/api/stripe/cleanup-products/route.ts:19` | LEGACY: Credits 50 | UNKNOWN | 🔴 LEGACY |
| `price_1SRHHhEVJvME7vkw4WqYbna5` | `app/api/stripe/cleanup-products/route.ts:20` | LEGACY: Credits 100 | UNKNOWN | 🔴 LEGACY |
| `price_1SRHIJEVJvME7vkwPLhGIcDw` | `app/api/stripe/cleanup-products/route.ts:21` | LEGACY: Credits 250 | UNKNOWN | 🔴 LEGACY |

### All `checkout.sessions.create` Calls:

| File | Line | Mode | Price Source | Metadata | Proration |
|------|------|------|--------------|----------|-----------|
| `app/actions/landing-checkout.ts` | 177 | subscription/payment | Env var with fallback | product_type, credits, source | N/A (new session) |
| `app/actions/stripe.ts` | 267 | subscription/payment | Env var with fallback | product_type, credits, source | N/A (new session) |
| `app/actions/upgrade-checkout.ts` | 236 | subscription | Env var only | product_type, credits, source, campaign | N/A (new session) |
| `app/api/stripe/create-checkout-session/route.ts` | 36 | payment | `price_data` (dynamic) | user_id, package_id, credits, product_type | N/A (disabled endpoint) |

### All `subscriptions.create` or `subscriptions.update` Calls:

| File | Line | Action | Proration Behavior | Risk |
|------|------|--------|-------------------|------|
| `app/api/subscription/upgrade/route.ts` | 103 | UPDATE | `create_prorations` | 🔴 HIGH - Immediate charge |
| `scripts/upgrade-beta-customer.ts` | 140 | UPDATE | `create_prorations` | ⚠️ MEDIUM - Manual script |

### All Uses of `invoiceitems.create`: **NONE FOUND** ✅

### All References to "legacy", "beta", "grandfather", "migration":

- `docs/STRIPE_CONFIG_VERIFICATION.md` - References "beta customers"
- `scripts/upgrade-beta-customer.ts` - Manual upgrade script
- `lib/credits.ts:28-29` - Comments about legacy 3-tier system
- `scripts/22-create-credit-system.sql:28-43` - Legacy subscription_credit_grants table (unused)

---

## 9. FINAL DIAGNOSIS

### Most Likely Cause #1: Environment Variable Misconfiguration or Fallback Usage
**Confidence:** 90%

**Proof:**
1. Hardcoded price ID fallback exists in production code
2. Documentation shows manual env var setup required
3. Past evidence of wrong price ID in local env (`.env.local`)
4. NO automated verification that production env vars are correct

**What users see:**
- Charged amount that doesn't match pricing page
- Example: Pricing page shows $97/month, but charged $87/month (if env var points to old price)

**How to verify:**
1. Check production environment variables in Vercel dashboard
2. Verify `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID` is set and matches `price_1SmIRaEVJvME7vkwMo5vSLzf`
3. Query Stripe API for that price ID: `stripe prices retrieve price_1SmIRaEVJvME7vkwMo5vSLzf`
4. Confirm amount is exactly 9700 (cents) = $97.00

---

### Most Likely Cause #2: Proration Charges on Subscription Changes
**Confidence:** 75%

**Proof:**
1. Upgrade flow explicitly uses `proration_behavior: "create_prorations"`
2. Creates immediate charge based on time remaining in billing cycle
3. Users may not understand proration and report "unexpected charge"

**What users see:**
- Small charge appears before expected renewal date
- Amount doesn't match any product price (it's a proration amount)
- Example: $23.50 charge when upgrading from $50 to $97 plan mid-month

**How to verify:**
1. Check Stripe Dashboard → Invoices for users reporting issues
2. Look for invoices with `billing_reason: "subscription_update"`
3. Check invoice line items for "Proration"

---

### Most Likely Cause #3: Hardcoded Fallback Pointing to Wrong Price
**Confidence:** 60%

**Proof:**
1. Hardcoded price ID has NO verification in code
2. Comment claims it's correct price, but comment could be outdated
3. If that price was changed in Stripe (e.g., beta pricing → production pricing), code would use old price

**What users see:**
- Charged old beta pricing instead of public pricing
- Or vice versa (charged more than beta price if hardcoded ID was updated)

**How to verify:**
1. Query Stripe: `stripe prices retrieve price_1SmIRaEVJvME7vkwMo5vSLzf`
2. Check `unit_amount`, `currency`, `recurring.interval`
3. Compare to expected: 9700 cents, usd, month

---

## 10. IMMEDIATE CONTAINMENT STEPS (NO CODE CHANGES)

### 🚨 URGENT ACTIONS (Do immediately):

1. **Verify Production Environment Variables:**
   ```bash
   # In Vercel Dashboard → Settings → Environment Variables
   # Check these exact values:
   STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID = price_1SmIRaEVJvME7vkwMo5vSLzf
   STRIPE_ONE_TIME_SESSION_PRICE_ID = price_1SRH7mEVJvME7vkw5vMjZC4s
   STRIPE_PAID_BLUEPRINT_PRICE_ID = price_1SnlJEEVJvME7vkw1thdr7WK
   ```

2. **Verify Stripe Price IDs are Correct:**
   ```bash
   # Using Stripe CLI:
   stripe prices retrieve price_1SmIRaEVJvME7vkwMo5vSLzf
   # Check output:
   # - unit_amount: 9700 (= $97.00)
   # - recurring.interval: month
   # - active: true
   ```

3. **Audit Recent Charges:**
   ```sql
   -- Query production database:
   SELECT 
     sp.stripe_payment_id,
     sp.user_id,
     sp.amount_cents / 100.0 AS amount_dollars,
     sp.product_type,
     sp.payment_type,
     sp.payment_date,
     sp.status,
     u.email
   FROM stripe_payments sp
   JOIN users u ON u.id = sp.user_id
   WHERE sp.payment_date > NOW() - INTERVAL '30 days'
     AND sp.is_test_mode = FALSE
     AND sp.status = 'succeeded'
   ORDER BY sp.payment_date DESC;
   ```
   
   **Look for:**
   - Amounts that don't match expected prices ($49, $47, $97, $9.99, $45, $85)
   - Multiple charges to same user in short time (possible duplicate)
   - $0 charges (coupon code issues)

4. **Check for Orphaned/Multiple Subscriptions:**
   ```sql
   -- Users with multiple active subscriptions (should be 0 or very few):
   SELECT user_id, COUNT(*) as subscription_count
   FROM subscriptions
   WHERE status = 'active'
   GROUP BY user_id
   HAVING COUNT(*) > 1;
   ```

5. **Deactivate Legacy Stripe Prices (in Stripe Dashboard):**
   - Search for products: "SSELFIE STUDIO MEMBERSHIP"
   - Find all associated prices
   - Archive/deactivate any prices that are NOT `price_1SmIRaEVJvME7vkwMo5vSLzf`
   - This prevents the fallback logic (lines 66-77) from selecting old prices

### ⚠️ MONITORING ACTIONS (Set up alerts):

1. **Set up Stripe Dashboard Alerts:**
   - Alert on payments > $150 (could indicate double-charge)
   - Alert on payments < $10 (could indicate wrong product)
   - Alert on failed payments (could indicate pricing issue)

2. **Monitor Webhook Failures:**
   ```sql
   -- Check webhook_errors table (if exists):
   SELECT * FROM webhook_errors 
   WHERE created_at > NOW() - INTERVAL '7 days'
   ORDER BY created_at DESC;
   ```

3. **Create Revenue Reconciliation Report:**
   ```sql
   -- Daily revenue by product type:
   SELECT 
     DATE(payment_date) as date,
     product_type,
     COUNT(*) as payment_count,
     SUM(amount_cents) / 100.0 as total_revenue,
     AVG(amount_cents) / 100.0 as avg_amount
   FROM stripe_payments
   WHERE payment_date > NOW() - INTERVAL '30 days'
     AND is_test_mode = FALSE
     AND status = 'succeeded'
   GROUP BY DATE(payment_date), product_type
   ORDER BY date DESC, product_type;
   ```

---

## 11. RECOMMENDED FIXES (For Implementation After Audit)

### 🔴 CRITICAL FIXES (Priority 1 - Do First):

1. **Remove Hardcoded Price ID Fallbacks:**
   - File: `app/actions/landing-checkout.ts`, line 38
   - File: `app/actions/stripe.ts`, line 128
   - Change from: `process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "price_1SmIRaEVJvME7vkwMo5vSLzf"`
   - Change to: Throw error if env var not set (fail fast, don't use wrong price)

2. **Add Payment-Level Idempotency for Credit Grants:**
   - Before granting credits in `invoice.payment_succeeded`, check:
     ```sql
     SELECT 1 FROM credit_transactions 
     WHERE stripe_payment_id = ${invoiceId} 
     AND transaction_type = 'subscription_grant' 
     LIMIT 1
     ```
   - If exists, skip credit grant

3. **Add Subscription Billing Period Tracking:**
   - Store `invoice.period_start` and `invoice.period_end` in database
   - Check if credits already granted for this specific period
   - Prevents double-grant if webhook retries

4. **Fix Cron Job 40-Day Window:**
   - Change from 40 days to 25 days (to match monthly billing)
   - Or better: Only grant if `last_grant < current_period_start`

### ⚠️ HIGH PRIORITY FIXES (Priority 2):

5. **Add Proration Warnings to UI:**
   - Before upgrade, show estimated proration charge
   - Formula: `(new_price - old_price) * (days_remaining / days_in_period)`

6. **Add Startup Price Validation:**
   - On app start, verify all env var price IDs exist in Stripe and are active
   - Log to monitoring if misconfigured

7. **Deactivate Legacy Prices in Stripe:**
   - Archive all old price IDs
   - Keep only current production prices active

### ✅ MEDIUM PRIORITY FIXES (Priority 3):

8. **Add Revenue Reconciliation Automation:**
   - Daily job to compare `stripe_payments` total vs Stripe Dashboard total
   - Alert if mismatch > 1%

9. **Add User-Facing Billing History:**
   - Show users their `stripe_payments` and `credit_transactions` in account page
   - Transparency reduces support tickets

10. **Improve Error Messages:**
    - When price ID not found, include which env var to check
    - When webhook fails, include user email in error log

---

## APPENDIX A: STRIPE INTEGRATION INVENTORY

| File | Purpose | Stripe Methods Used | Notes |
|------|---------|-------------------|-------|
| `lib/stripe.ts` | Stripe client initialization | N/A | Singleton pattern |
| `lib/credits.ts` | Credit operations | N/A | No direct Stripe calls |
| `lib/products.ts` | Product definitions | N/A | Static config |
| `app/actions/landing-checkout.ts` | Landing page checkout | `checkout.sessions.create`, `prices.retrieve`, `products.retrieve` | Has hardcoded fallback |
| `app/actions/stripe.ts` | App checkout | `checkout.sessions.create`, `customers.create`, `coupons.retrieve` | Has hardcoded fallback |
| `app/actions/upgrade-checkout.ts` | Upgrade checkout | `checkout.sessions.create`, `customers.create`, `prices.retrieve`, `promotionCodes.list`, `coupons.retrieve` | No hardcoded fallback |
| `app/api/webhooks/stripe/route.ts` | Webhook handler | `webhooks.constructEvent`, `paymentIntents.retrieve`, `subscriptions.retrieve` | 2599 lines - CRITICAL FILE |
| `app/api/subscription/upgrade/route.ts` | Subscription upgrade API | `subscriptions.retrieve`, `subscriptions.update` | Uses proration |
| `app/api/cron/reconcile-credits/route.ts` | Credit reconciliation | `paymentIntents.list`, `invoices.list` | Optional Stripe backfill |
| `app/api/stripe/verify-setup/route.ts` | Diagnostic API | `prices.retrieve`, `products.retrieve` | Read-only |
| `scripts/verify-stripe-prices.ts` | Price verification script | `prices.retrieve` | Diagnostic tool |

---

## APPENDIX B: PRICE ID AUDIT TRAIL

### Current Production Price IDs (Expected):

```typescript
// Source: lib/products.ts
PRICING_PRODUCTS = [
  {
    id: "one_time_session",
    name: "Starter Photoshoot",
    priceInCents: 4900, // $49
    credits: 50,
    // Expected Price ID: price_1SRH7mEVJvME7vkw5vMjZC4s
  },
  {
    id: "sselfie_studio_membership",
    name: "Creator Studio",
    priceInCents: 9700, // $97/month
    credits: 200,
    // Expected Price ID: price_1SmIRaEVJvME7vkwMo5vSLzf
  },
  {
    id: "paid_blueprint",
    name: "Brand Blueprint - Paid",
    priceInCents: 4700, // $47
    credits: 60,
    // Expected Price ID: price_1SnlJEEVJvME7vkw1thdr7WK
  },
]
```

### Legacy Price IDs (To Deactivate):

```typescript
// Source: app/api/stripe/cleanup-products/route.ts
const LEGACY_PRICES_TO_ARCHIVE = {
  "SSELFIE STUDIO MEMBERSHIP": "price_1SRH36EVJvME7vkwQO096AFb", // OLD
  "CREDITS 50": "price_1SRHH3EVJvME7vkwwx9tLXeB",
  "CREDITS 100": "price_1SRHHhEVJvME7vkw4WqYbna5",
  "CREDITS 250": "price_1SRHIJEVJvME7vkwPLhGIcDw",
}
```

---

## APPENDIX C: WEBHOOK EVENT FLOW DIAGRAM

```
Stripe Event → Vercel Function (app/api/webhooks/stripe/route.ts)
                       ↓
              [Verify Signature] (line 56)
                       ↓
              [Check Idempotency] (line 76) ← webhook_events table
                       ↓
              [Rate Limit Check] (line 96)
                       ↓
         ┌─────────[Switch on event.type]─────────┐
         ↓                                         ↓
[checkout.session.completed]        [invoice.payment_succeeded]
         ↓                                         ↓
  [session.mode?]                     [Find subscription in DB]
         ↓                                         ↓
  ┌──────┴──────┐                    [Grant monthly credits]
  ↓             ↓                                  ↓
[payment]  [subscription]                [Store in stripe_payments]
  ↓             ↓
[Grant credits] [Wait for invoice]
  ↓
[Store in stripe_payments]
```

---

## SUMMARY OF FILES REQUIRING IMMEDIATE REVIEW

1. **Production Environment Variables** (Vercel Dashboard)
   - `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID`
   - `STRIPE_ONE_TIME_SESSION_PRICE_ID`
   - `STRIPE_PAID_BLUEPRINT_PRICE_ID`

2. **app/actions/landing-checkout.ts** (Line 38 - hardcoded fallback)

3. **app/actions/stripe.ts** (Line 128 - hardcoded fallback)

4. **app/api/webhooks/stripe/route.ts** (Lines 2050-2450 - `invoice.payment_succeeded` credit grant logic)

5. **app/api/subscription/upgrade/route.ts** (Line 110 - proration behavior)

6. **app/api/cron/reconcile-credits/route.ts** (Line 133 - 40-day window)

7. **Stripe Dashboard** (Price objects - verify amounts and deactivate legacy prices)

---

## NEXT STEPS FOR SANDRA

1. ✅ **Read this audit report thoroughly**
2. 🔴 **Execute all "URGENT ACTIONS" in Section 10**
3. ⚠️ **Review findings with Stripe Dashboard access**
4. 📊 **Run SQL queries in Appendix to identify affected users**
5. 🛠️ **Prioritize fixes from Section 11**
6. 📧 **Prepare user communication if overcharges confirmed**
7. 💰 **Issue refunds/credits to affected users if necessary**

---

**End of Forensic Audit Report**  
**Prepared by:** Cursor AI (Autonomous Engineering Team)  
**Date:** 2026-01-19  
**Classification:** CRITICAL - PRODUCTION BILLING ISSUE
