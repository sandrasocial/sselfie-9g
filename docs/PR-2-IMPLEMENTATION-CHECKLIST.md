# PR-2 Implementation Checklist

**PR Title:** Webhook support for paid_blueprint purchases  
**Status:** ✅ Complete  
**Files Changed:** 1  
**Lines Added:** ~120

---

## ✅ STEP 0 — VERIFY (COMPLETED)

### Repository Verification

- [x] **Opened `/app/api/webhooks/stripe/route.ts`**
  - Confirmed `session.metadata.product_type` is the key for product detection (line 136)
  - Confirmed existing product types: `one_time_session`, `sselfie_studio_membership`, `credit_topup`
  - Confirmed customer email pattern: `session.customer_details?.email || session.customer_email`
  - Confirmed existing stripe_payments insert pattern (lines 727-763)
  - Confirmed existing ESP tagging pattern (lines 179-280)

- [x] **Opened `/scripts/migrations/017_create_stripe_payments_table.sql`**
  - Confirmed required columns for stripe_payments
  - Confirmed idempotency: `ON CONFLICT (stripe_payment_id) DO UPDATE`
  - Confirmed nullable user_id (supports non-account purchases)

- [x] **Opened `/scripts/create-blueprint-subscribers-table.sql`**
  - Confirmed existing columns: `converted_to_user`, `converted_at`
  - Confirmed NO `paid_blueprint_*` columns exist yet (will be added in PR-3)
  - Strategy: Only update existing columns in PR-2

- [x] **Searched for existing paid_blueprint references**
  - Found: `/scripts/migrations/create-paid-blueprint-feature-flag.sql` (feature flag only)
  - Confirmed: No conflicting paid_blueprint logic exists

---

## ✅ STEP 1 — IMPLEMENT paid_blueprint HANDLER (COMPLETED)

### Changes Made

- [x] **Added `paid_blueprint` to product tag mapping** (line ~147)
  ```typescript
  else if (productType === "paid_blueprint") {
    productTag = "paid-blueprint"
  }
  ```

- [x] **Added complete `paid_blueprint` handler** (after credit_topup, line ~925)
  - Extract payment details (paymentIntentId, amount, customer)
  - Retrieve payment amount from Stripe API (with fallback to session.amount_total)
  - Insert into stripe_payments with:
    - `stripe_payment_id`: paymentIntentId
    - `stripe_customer_id`: customerId
    - `user_id`: NULL (no account required)
    - `amount_cents`: paymentAmountCents
    - `currency`: 'usd'
    - `status`: 'succeeded' or 'pending'
    - `payment_type`: 'paid_blueprint'
    - `product_type`: 'paid_blueprint'
    - `description`: 'SSELFIE Brand Blueprint - 30 Custom Photos'
    - `metadata`: { ...session.metadata, customer_email, session_id }
    - `is_test_mode`: !event.livemode
  - ON CONFLICT idempotency: update status only
  - Log: "NO credits granted (photos stored directly)"

---

## ✅ STEP 2 — blueprint_subscribers UPDATE (COMPLETED)

### Safe Column Updates

- [x] **Check if email exists in blueprint_subscribers**
  - Query: `SELECT id FROM blueprint_subscribers WHERE email = ${customerEmail}`

- [x] **Update ONLY existing columns**
  - `converted_to_user = TRUE`
  - `converted_at = NOW()`
  - `updated_at = NOW()`
  - Condition: `WHERE email = ${customerEmail} AND converted_to_user = FALSE`

- [x] **Log deferral message**
  - "Paid blueprint purchase flags deferred until PR-3 migration"

- [x] **Handle missing email gracefully**
  - Log warning: "Email not found in blueprint_subscribers"
  - Do NOT fail webhook

---

## ✅ STEP 3 — KEEP TAGGING CONSISTENT (COMPLETED)

### ESP Integration

- [x] **Reused existing Resend tagging logic** (lines 179-223)
  - Automatically tags with `paid-blueprint` via productTag variable
  - Adds to audience with status: 'customer'
  - Adds custom fields: product, journey, converted, purchase_date

- [x] **Reused existing Flodesk tagging logic** (lines 226-280)
  - Automatically syncs with tags: ['customer', 'paid', 'paid-blueprint']
  - Updates blueprint_subscribers with flodesk_contact_id

- [x] **Reused existing conversion tracking** (lines 282-335)
  - Updates freebie_subscribers with 'purchased' tag
  - Marks converted in blueprint_subscribers
  - Marks converted in welcome_back_sequence
  - Marks converted in email_logs

**Result:** No new ESP integration code needed. Existing logic handles paid_blueprint automatically.

---

## ✅ STEP 4 — ACCEPTANCE CRITERIA (READY FOR TESTING)

### Functionality Checklist

- [x] paid_blueprint purchase triggers webhook handler
- [x] Webhook is idempotent (replay does not create duplicates)
- [x] NO credits granted
- [x] NO failing SQL if blueprint_subscribers columns missing
- [x] stripe_payments row contains all required fields:
  - [x] stripe_payment_id
  - [x] amount_cents (4700 for $47)
  - [x] currency ('usd')
  - [x] product_type ('paid_blueprint')
  - [x] payment_type ('paid_blueprint')
  - [x] is_test_mode (correctly set)
  - [x] metadata (includes customer_email, session_id, promo_code if present)

### Safety Checklist

- [x] No changes to existing product type handlers
- [x] No schema changes (no migrations)
- [x] No credit grants
- [x] No user account creation
- [x] No photo generation
- [x] No delivery emails
- [x] No UI changes

### Error Handling Checklist

- [x] Handles missing paymentIntentId (logs error, continues)
- [x] Handles payment retrieval failure (fallback to session.amount_total)
- [x] Handles stripe_payments insert failure (logs error, continues)
- [x] Handles missing blueprint_subscribers email (logs warning, continues)
- [x] Handles blueprint_subscribers update failure (logs error, continues)
- [x] All errors logged but do not prevent 200 OK response

### Logging Checklist

- [x] Clear log: "💎 Paid Blueprint purchase from {email}"
- [x] Clear log: "Retrieved payment amount: ${amount}"
- [x] Clear log: "✅ Stored paid blueprint payment in stripe_payments table"
- [x] Clear log: "ℹ️ Paid blueprint: NO credits granted (photos stored directly)"
- [x] Clear log: "✅ Marked blueprint subscriber {email} as converted"
- [x] Clear log: "ℹ️ Paid blueprint purchase flags deferred until PR-3 migration"

---

## ✅ STEP 5 — TESTING INSTRUCTIONS (DOCUMENTED)

### Testing Documentation Created

- [x] **Created `/docs/PR-2-WEBHOOK-TESTING.md`**
  - Test 1: Happy path (paid blueprint purchase)
  - Test 2: Idempotency (replay protection)
  - Test 3: Email not in blueprint_subscribers
  - Test 4: Payment pending (not paid)
  - Test 5: ESP tagging (Resend + Flodesk)
  - Test 6: Production webhook (Stripe dashboard)
  - Database verification queries
  - Expected log output
  - Acceptance criteria checklist

- [x] **Created `/docs/PR-2-SUMMARY.md`**
  - Plain-language summary for Sandra
  - What happens step-by-step
  - What does NOT happen (safety)
  - Database examples
  - Quick test instructions
  - Edge cases handled
  - Rollback plan
  - Next steps (PR-3, PR-4, PR-5)

---

## 📋 DELIVERABLE FORMAT (COMPLETED)

### 1. Verified Findings

**File:** `/app/api/webhooks/stripe/route.ts`
- Line 136: `session.metadata.product_type` is the product detection key
- Lines 139-145: Existing product types mapped to tags
- Lines 727-763: stripe_payments insert pattern (one_time_session)
- Lines 179-280: ESP tagging pattern (Resend + Flodesk)
- Lines 282-335: Conversion tracking pattern

**File:** `/scripts/migrations/017_create_stripe_payments_table.sql`
- Required columns verified
- Idempotency constraint: `UNIQUE (stripe_payment_id)`
- user_id is nullable (supports non-account purchases)

**File:** `/scripts/create-blueprint-subscribers-table.sql`
- Existing columns: `converted_to_user`, `converted_at` (safe to update)
- Missing columns: `paid_blueprint_*` (will be added in PR-3)

### 2. Files Changed/Added

**Modified:**
- `/app/api/webhooks/stripe/route.ts` (~120 lines added)

**Created:**
- `/docs/PR-2-WEBHOOK-TESTING.md` (comprehensive testing guide)
- `/docs/PR-2-SUMMARY.md` (plain-language summary for Sandra)
- `/docs/PR-2-IMPLEMENTATION-CHECKLIST.md` (this file)

### 3. How to Test

**Quick Test:**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.product_type=paid_blueprint \
  --add checkout_session:customer_email=test@example.com
```

**Verify:**
```sql
-- Payment logged
SELECT * FROM stripe_payments WHERE product_type = 'paid_blueprint' ORDER BY created_at DESC LIMIT 1;

-- Subscriber updated
SELECT email, converted_to_user, converted_at FROM blueprint_subscribers WHERE email = 'test@example.com';

-- No credits granted
SELECT COUNT(*) FROM credit_transactions WHERE description ILIKE '%paid blueprint%';
-- Expected: 0
```

**Full testing guide:** `/docs/PR-2-WEBHOOK-TESTING.md`

### 4. Out of Scope Confirmed

**NOT in PR-2:**
- ❌ Database migrations (no new columns)
- ❌ Photo generation logic
- ❌ Delivery emails
- ❌ UI changes (checkout page, success page, gallery)
- ❌ User account creation
- ❌ Credit grants
- ❌ Blueprint email sequence updates

**Coming in future PRs:**
- PR-3: Schema + generation API
- PR-4: Delivery email
- PR-5: Checkout page UI
- PR-6: Success page + gallery UI

---

## 🎯 FINAL CHECKLIST

### Code Quality

- [x] No linter errors
- [x] Follows existing code patterns
- [x] Consistent with other product type handlers
- [x] Clear comments and logging
- [x] Error handling comprehensive

### Documentation

- [x] Testing guide created
- [x] Summary for Sandra created
- [x] Implementation checklist created
- [x] Edge cases documented
- [x] Rollback plan documented

### Safety

- [x] No breaking changes
- [x] No schema changes
- [x] Isolated logic (does not affect existing products)
- [x] Idempotent (safe to replay)
- [x] Fail-safe (errors logged, webhook succeeds)

### Ready for Deployment

- [x] Code complete
- [x] Documentation complete
- [x] Testing instructions clear
- [ ] **Stripe product created at $47** (Sandra to do)
- [ ] **Price ID in `.env.local`** (Sandra to do)
- [ ] **Test purchase completed** (Sandra to do)
- [ ] **Sandra approves deployment** (Sandra to do)

---

## 🚀 NEXT STEPS

1. **Sandra:** Create Stripe product at $47
2. **Sandra:** Set `STRIPE_PAID_BLUEPRINT_PRICE_ID` in `.env.local`
3. **Sandra:** Run test purchase using Stripe CLI
4. **Sandra:** Verify database (stripe_payments, blueprint_subscribers)
5. **Sandra:** Approve deployment to production
6. **Team:** Monitor first 10 production purchases
7. **Team:** Start PR-3 (schema + generation)

---

**PR-2 Status:** ✅ COMPLETE AND READY FOR TESTING

**Risk Level:** 🟢 Low  
**Effort:** 🟢 Low (120 lines, 1 file)  
**Impact:** 🟢 Foundation for paid blueprint feature  

**Estimated Testing Time:** 15 minutes  
**Estimated Deployment Time:** 5 minutes  

---

**Questions?** See `/docs/PR-2-SUMMARY.md` for plain-language explanation.  
**Testing?** See `/docs/PR-2-WEBHOOK-TESTING.md` for step-by-step guide.
