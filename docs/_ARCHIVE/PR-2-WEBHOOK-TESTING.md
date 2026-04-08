# PR-2: Webhook Support for Paid Blueprint - Testing Guide

**Status:** ✅ Ready for Testing  
**PR Scope:** Webhook processing for `paid_blueprint` purchases ONLY

---

## ✅ What Was Changed

### Files Modified: 1

**`/app/api/webhooks/stripe/route.ts`**
- Added `paid_blueprint` to product tag mapping (line ~147)
- Added complete `paid_blueprint` handler in `checkout.session.completed` event (after credit_topup, before subscription mode)

---

## 🔍 Verified Findings (Step 0 Evidence)

### 1. Product Type Detection
- **Location:** `/app/api/webhooks/stripe/route.ts` line 136
- **Key:** `session.metadata.product_type`
- **Existing types:** `one_time_session`, `sselfie_studio_membership`, `credit_topup`
- **Added:** `paid_blueprint`

### 2. Customer Email Retrieval
- **Pattern:** `session.customer_details?.email || session.customer_email`
- **Used consistently across all product types**

### 3. stripe_payments Schema
- **File:** `/scripts/migrations/017_create_stripe_payments_table.sql`
- **Required columns:**
  - `stripe_payment_id` (TEXT UNIQUE NOT NULL)
  - `stripe_customer_id` (TEXT NOT NULL)
  - `user_id` (TEXT, nullable for non-account purchases)
  - `amount_cents` (INTEGER NOT NULL)
  - `currency` (TEXT DEFAULT 'usd')
  - `status` (TEXT NOT NULL: succeeded/pending/failed/refunded)
  - `payment_type` (TEXT NOT NULL)
  - `product_type` (TEXT)
  - `description` (TEXT)
  - `metadata` (JSONB DEFAULT '{}')
  - `payment_date` (TIMESTAMPTZ NOT NULL)
  - `is_test_mode` (BOOLEAN DEFAULT FALSE)
- **Idempotency:** `ON CONFLICT (stripe_payment_id) DO UPDATE`

### 4. blueprint_subscribers Current Schema
- **File:** `/scripts/create-blueprint-subscribers-table.sql`
- **Existing columns we CAN update safely:**
  - `converted_to_user` (BOOLEAN)
  - `converted_at` (TIMESTAMPTZ)
- **Missing columns (will be added in PR-3):**
  - `paid_blueprint_purchased`
  - `paid_blueprint_purchased_at`
  - `paid_blueprint_stripe_payment_id`
  - `paid_blueprint_photo_urls`
  - `paid_blueprint_generated`
  - `paid_blueprint_generated_at`
- **PR-2 Strategy:** Only update existing columns, defer paid-specific flags until PR-3

### 5. ESP Tagging Pattern
- **Resend:** Uses `addOrUpdateResendContact()` with tags
- **Flodesk:** Uses `syncContactToFlodesk()` with tags
- **Existing tags:** `one-time-session`, `content-creator-studio`, `credit-topup`
- **Added:** `paid-blueprint`

---

## 🎯 Implementation Details

### Paid Blueprint Handler Logic

```typescript
else if (productType === "paid_blueprint") {
  // 1. Extract payment details
  const paymentIntentId = session.payment_intent
  const paymentAmountCents = session.amount_total (or from paymentIntent.retrieve)
  const customerId = session.customer
  const isTestMode = !event.livemode
  
  // 2. Log payment to stripe_payments
  INSERT INTO stripe_payments (
    stripe_payment_id: paymentIntentId,
    stripe_customer_id: customerId,
    user_id: NULL, // No user account required
    amount_cents: paymentAmountCents,
    currency: 'usd',
    status: 'succeeded' (if paid) or 'pending',
    payment_type: 'paid_blueprint',
    product_type: 'paid_blueprint',
    description: 'SSELFIE Brand Blueprint - 30 Custom Photos',
    metadata: { ...session.metadata, customer_email, session_id },
    payment_date: NOW(),
    is_test_mode: isTestMode
  )
  ON CONFLICT (stripe_payment_id) DO UPDATE status
  
  // 3. NO credits granted
  console.log("Paid blueprint: NO credits granted (photos stored directly)")
  
  // 4. Update blueprint_subscribers (only existing columns)
  UPDATE blueprint_subscribers
  SET 
    converted_to_user = TRUE,
    converted_at = NOW()
  WHERE email = customerEmail
  
  // 5. Log deferral message
  console.log("Paid blueprint purchase flags deferred until PR-3 migration")
}
```

### What Does NOT Happen in PR-2
- ❌ NO credits granted
- ❌ NO user account creation
- ❌ NO paid_blueprint_* columns updated (don't exist yet)
- ❌ NO photo generation (PR-3)
- ❌ NO delivery email (PR-4)
- ❌ NO UI changes

### What DOES Happen in PR-2
- ✅ Webhook idempotency (duplicate prevention)
- ✅ Payment logged to stripe_payments
- ✅ ESP tagging (Resend + Flodesk) with "paid-blueprint" tag
- ✅ blueprint_subscribers.converted_to_user = TRUE
- ✅ Conversion tracking in email sequences (existing logic)
- ✅ Safe handling if blueprint_subscribers record missing

---

## 🧪 Testing Instructions

### Prerequisites
1. Stripe CLI installed: `brew install stripe/stripe-cli/stripe`
2. Stripe CLI logged in: `stripe login`
3. Dev server running: `npm run dev`
4. Database access (Neon dashboard or local psql)

---

### Test 1: Paid Blueprint Purchase (Happy Path)

**Setup:**
1. Create test customer in Stripe dashboard
2. Create test checkout session with metadata:
   ```json
   {
     "product_type": "paid_blueprint",
     "source": "landing"
   }
   ```
3. Ensure customer email exists in `blueprint_subscribers` table

**Execute:**
```bash
# Forward webhooks to local dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test checkout.session.completed event
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.product_type=paid_blueprint \
  --add checkout_session:customer_email=test@example.com
```

**Verify:**
1. **Console logs show:**
   ```
   [v0] 💎 Paid Blueprint purchase from test@example.com
   [v0] Retrieved payment amount: $47.00
   [v0] ✅ Stored paid blueprint payment in stripe_payments table
   [v0] ℹ️ Paid blueprint: NO credits granted (photos stored directly)
   [v0] ✅ Marked blueprint subscriber test@example.com as converted
   [v0] ℹ️ Paid blueprint purchase flags deferred until PR-3 migration
   ```

2. **Database query - stripe_payments:**
   ```sql
   SELECT 
     stripe_payment_id,
     amount_cents,
     currency,
     status,
     payment_type,
     product_type,
     description,
     metadata->>'customer_email' as email,
     is_test_mode
   FROM stripe_payments
   WHERE product_type = 'paid_blueprint'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   **Expected:**
   - `amount_cents`: 4700
   - `currency`: usd
   - `status`: succeeded
   - `payment_type`: paid_blueprint
   - `product_type`: paid_blueprint
   - `description`: SSELFIE Brand Blueprint - 30 Custom Photos
   - `metadata` contains: customer_email, session_id, product_type
   - `is_test_mode`: true

3. **Database query - blueprint_subscribers:**
   ```sql
   SELECT 
     email,
     converted_to_user,
     converted_at
   FROM blueprint_subscribers
   WHERE email = 'test@example.com';
   ```
   **Expected:**
   - `converted_to_user`: true
   - `converted_at`: recent timestamp

4. **Database query - NO credits granted:**
   ```sql
   SELECT COUNT(*) 
   FROM credit_transactions
   WHERE description ILIKE '%paid blueprint%';
   ```
   **Expected:** 0 rows

---

### Test 2: Webhook Idempotency (Replay Protection)

**Execute:**
```bash
# Replay the same event twice
stripe events resend evt_XXXXX
stripe events resend evt_XXXXX
```

**Verify:**
1. **Console logs show:**
   ```
   [v0] ⚠️ Duplicate event detected: evt_XXXXX - skipping processing
   ```

2. **Database query - stripe_payments:**
   ```sql
   SELECT COUNT(*) 
   FROM stripe_payments
   WHERE stripe_payment_id = 'pi_XXXXX';
   ```
   **Expected:** 1 row (not duplicated)

---

### Test 3: Email Not in blueprint_subscribers

**Setup:**
1. Use email that does NOT exist in `blueprint_subscribers`

**Execute:**
```bash
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.product_type=paid_blueprint \
  --add checkout_session:customer_email=nonexistent@example.com
```

**Verify:**
1. **Console logs show:**
   ```
   [v0] ✅ Stored paid blueprint payment in stripe_payments table
   [v0] ⚠️ Email nonexistent@example.com not found in blueprint_subscribers
   ```

2. **Webhook does NOT fail** (returns 200 OK)

3. **stripe_payments row still created** (payment logged regardless)

---

### Test 4: Payment Pending (Not Paid)

**Setup:**
1. Create checkout session with `payment_status: 'unpaid'`

**Execute:**
```bash
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.product_type=paid_blueprint \
  --add checkout_session:payment_status=unpaid
```

**Verify:**
1. **stripe_payments row created with:**
   - `status`: pending (not succeeded)

2. **blueprint_subscribers still updated** (converted flag set)

---

### Test 5: ESP Tagging (Resend + Flodesk)

**Verify:**
1. **Resend dashboard:**
   - Contact exists with tag: `paid-blueprint`
   - Contact has tags: `customer`, `paid`, `paid-blueprint`

2. **Flodesk dashboard:**
   - Contact exists with tag: `paid-blueprint`
   - Custom field `product`: `paid-blueprint`

3. **Database query - blueprint_subscribers:**
   ```sql
   SELECT 
     email,
     resend_contact_id,
     flodesk_contact_id,
     synced_to_flodesk,
     flodesk_synced_at
   FROM blueprint_subscribers
   WHERE email = 'test@example.com';
   ```
   **Expected:**
   - `resend_contact_id`: populated
   - `flodesk_contact_id`: populated
   - `synced_to_flodesk`: true
   - `flodesk_synced_at`: recent timestamp

---

### Test 6: Production Webhook (Stripe Dashboard)

**Setup:**
1. Create real Stripe product at $47
2. Set `STRIPE_PAID_BLUEPRINT_PRICE_ID` in production env
3. Create test checkout session in Stripe dashboard

**Execute:**
1. Complete checkout in test mode
2. Monitor Vercel logs or webhook dashboard

**Verify:**
1. **Stripe webhook dashboard shows:**
   - Event: `checkout.session.completed`
   - Response: 200 OK
   - No errors

2. **Production database:**
   - stripe_payments row exists
   - blueprint_subscribers updated
   - is_test_mode: true (for test purchases)

---

## 📋 Acceptance Criteria Checklist

### Functionality
- [ ] Paid blueprint purchase triggers webhook handler
- [ ] Payment logged to `stripe_payments` with correct data
- [ ] `product_type` = 'paid_blueprint'
- [ ] `payment_type` = 'paid_blueprint'
- [ ] `amount_cents` = 4700 ($47)
- [ ] `description` = 'SSELFIE Brand Blueprint - 30 Custom Photos'
- [ ] `metadata` includes: customer_email, session_id, product_type
- [ ] `is_test_mode` correctly set based on event.livemode

### Idempotency
- [ ] Duplicate webhook events do not create duplicate stripe_payments rows
- [ ] `ON CONFLICT (stripe_payment_id)` updates status only

### Credits
- [ ] NO credits granted for paid_blueprint purchases
- [ ] NO rows in credit_transactions for paid_blueprint

### Database Safety
- [ ] No SQL errors if blueprint_subscribers columns missing
- [ ] Only updates existing columns (converted_to_user, converted_at)
- [ ] Logs deferral message for paid_blueprint_* columns

### ESP Integration
- [ ] Resend contact tagged with "paid-blueprint"
- [ ] Flodesk contact tagged with "paid-blueprint"
- [ ] Existing ESP logic reused (no new integration code)

### Error Handling
- [ ] Webhook does not fail if blueprint_subscribers email missing
- [ ] Webhook does not fail if ESP sync fails
- [ ] Webhook does not fail if payment storage fails
- [ ] All errors logged but do not prevent 200 OK response

### Logging
- [ ] Clear console logs for each step
- [ ] Deferral message logged: "Paid blueprint purchase flags deferred until PR-3 migration"
- [ ] No misleading "credits granted" messages

---

## 🚨 Out of Scope (Confirmed)

### NOT in PR-2:
- ❌ Database migrations (no new columns)
- ❌ Photo generation logic
- ❌ Delivery emails
- ❌ UI changes (checkout page, success page, gallery)
- ❌ User account creation
- ❌ Credit grants
- ❌ Blueprint email sequence updates

### Coming in Future PRs:
- **PR-3:** Add 6 columns to blueprint_subscribers + generation API
- **PR-4:** Delivery email template + sending trigger
- **PR-5:** Checkout page UI
- **PR-6:** Success page + gallery UI

---

## 🔄 Rollback Plan

If PR-2 causes issues in production:

### Option 1: Feature Flag (Recommended)
```sql
-- Disable paid blueprint checkout
UPDATE admin_feature_flags
SET is_enabled = FALSE
WHERE flag_name = 'paid_blueprint_enabled';
```

### Option 2: Stripe Price Deactivation
1. Go to Stripe Dashboard → Products
2. Find "SSELFIE Brand Blueprint"
3. Archive the price (prevents new checkouts)

### Option 3: Code Revert
```bash
git revert <PR-2-commit-hash>
git push origin main
```

**Impact of rollback:**
- Existing paid_blueprint purchases still logged in stripe_payments (safe)
- New purchases will fail at checkout (price inactive)
- No data loss

---

## 📊 Expected Log Output (Success)

```
================================================================================
[v0] 🔔 WEBHOOK RECEIVED at: 2026-01-09T12:34:56.789Z
[v0] Request URL: https://sselfie.ai/api/webhooks/stripe
[v0] Request method: POST
================================================================================
[v0] ✅ Webhook signature verified successfully
[v0] Event evt_1234567890 recorded in idempotency table
[v0] Stripe webhook event: checkout.session.completed
[v0] Event ID: evt_1234567890
[v0] Event livemode: TEST MODE
[v0] 🎉 Checkout session completed!
[v0] Session ID: cs_test_1234567890
[v0] Mode: payment
[v0] Payment status: paid
[v0] Customer email: sandra@example.com
[v0] Metadata: { product_type: 'paid_blueprint', source: 'landing' }
[v0] Test mode: YES (TEST)
[v0] Added paying customer sandra@example.com to Resend audience with ID: abc123
[v0] ✅ Added paying customer to Flodesk: sandra@example.com
[v0] ✅ Updated blueprint_subscribers with Flodesk contact ID
[v0] Tagged sandra@example.com as purchased in freebie_subscribers
[v0] Marked sandra@example.com as converted in all email sequences
[v0] Updated Resend tags for sandra@example.com to customer status
[v0] 💎 Paid Blueprint purchase from sandra@example.com
[v0] Retrieved payment amount: $47.00
[v0] ✅ Stored paid blueprint payment in stripe_payments table
[v0] ℹ️ Paid blueprint: NO credits granted (photos stored directly)
[v0] ✅ Marked blueprint subscriber sandra@example.com as converted
[v0] ℹ️ Paid blueprint purchase flags deferred until PR-3 migration
```

---

## 🎯 Success Criteria

PR-2 is successful when:

1. ✅ Test purchase completes without errors
2. ✅ stripe_payments row created with correct data
3. ✅ NO credits granted
4. ✅ blueprint_subscribers.converted_to_user = TRUE
5. ✅ ESP contacts tagged correctly
6. ✅ Webhook idempotency working (no duplicates)
7. ✅ No SQL errors if columns missing
8. ✅ All logs clear and accurate

---

**Ready to test!** 🚀

**Next:** After PR-2 verified in production → Start PR-3 (schema + generation)
