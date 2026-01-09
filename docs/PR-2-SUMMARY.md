# PR-2 Summary: Webhook Support for Paid Blueprint

**Status:** ✅ Complete and Ready for Testing  
**Scope:** Webhook processing ONLY (no migrations, no generation, no emails, no UI)

---

## 🎯 What This PR Does

When someone completes a paid blueprint checkout ($47), Stripe sends a webhook to your server. PR-2 makes sure that webhook:

1. **Logs the payment** → Stores revenue in your database
2. **Tags the customer** → Adds them to your email lists with "paid-blueprint" tag
3. **Marks them as converted** → Updates their blueprint subscriber record
4. **Does NOT grant credits** → This is a photo-storage product, not a credit product
5. **Waits for PR-3** → Defers paid-specific tracking until schema is ready

---

## 📝 What Changed

### Files Modified: 1

**`/app/api/webhooks/stripe/route.ts`**
- Added `paid_blueprint` to the product tag mapping (line ~147)
- Added complete handler for `paid_blueprint` purchases (after credit_topup section)

**Lines added:** ~120 lines  
**Risk level:** 🟢 Low (isolated, no existing logic changed)

---

## ✅ What Happens When Someone Buys

### Step-by-Step Flow

1. **Customer completes checkout** → Stripe sends `checkout.session.completed` webhook
2. **Your server receives webhook** → Verifies signature, checks for duplicates
3. **Detects product type** → Reads `metadata.product_type = 'paid_blueprint'`
4. **Logs payment** → Inserts row into `stripe_payments` table:
   - Amount: $47.00 (4700 cents)
   - Product: paid_blueprint
   - Customer email
   - Test mode flag
   - Session metadata
5. **Tags customer** → Adds to Resend + Flodesk with "paid-blueprint" tag
6. **Marks as converted** → Updates `blueprint_subscribers.converted_to_user = TRUE`
7. **Logs deferral** → "Paid blueprint purchase flags deferred until PR-3 migration"
8. **Returns success** → Stripe gets 200 OK

---

## 🛡️ What Does NOT Happen (Safety)

- ❌ **NO credits granted** → This is intentional (photos stored directly, not via credits)
- ❌ **NO user account created** → Blueprint uses token-based access
- ❌ **NO photo generation** → That's PR-3
- ❌ **NO delivery email** → That's PR-4
- ❌ **NO new database columns** → PR-3 adds those
- ❌ **NO UI changes** → Checkout page is PR-5

---

## 📊 What You'll See in the Database

### stripe_payments Table (New Row)

```
stripe_payment_id:     pi_1234567890
stripe_customer_id:    cus_ABC123
user_id:               NULL (no account required)
amount_cents:          4700
currency:              usd
status:                succeeded
payment_type:          paid_blueprint
product_type:          paid_blueprint
description:           SSELFIE Brand Blueprint - 30 Custom Photos
metadata:              { customer_email, session_id, product_type, ... }
is_test_mode:          true (for test purchases)
payment_date:          2026-01-09 12:34:56
```

### blueprint_subscribers Table (Updated)

```
email:                 sandra@example.com
converted_to_user:     TRUE (was FALSE)
converted_at:          2026-01-09 12:34:56 (was NULL)
resend_contact_id:     abc123
flodesk_contact_id:    xyz789
```

### credit_transactions Table (No Changes)

```
(No rows added - this is correct!)
```

---

## 🧪 How to Test

### Quick Test (Stripe CLI)

```bash
# 1. Start webhook listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 2. Trigger test event
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.product_type=paid_blueprint \
  --add checkout_session:customer_email=test@example.com

# 3. Check logs for:
[v0] 💎 Paid Blueprint purchase from test@example.com
[v0] ✅ Stored paid blueprint payment in stripe_payments table
[v0] ℹ️ Paid blueprint: NO credits granted (photos stored directly)
```

### Verify in Database

```sql
-- Check payment logged
SELECT * FROM stripe_payments 
WHERE product_type = 'paid_blueprint' 
ORDER BY created_at DESC LIMIT 1;

-- Check subscriber updated
SELECT email, converted_to_user, converted_at 
FROM blueprint_subscribers 
WHERE email = 'test@example.com';

-- Confirm NO credits granted
SELECT COUNT(*) FROM credit_transactions 
WHERE description ILIKE '%paid blueprint%';
-- Expected: 0
```

**Full testing guide:** `/docs/PR-2-WEBHOOK-TESTING.md`

---

## 🚨 Edge Cases Handled

### 1. Email Not in blueprint_subscribers
- **What happens:** Payment still logged, warning logged, webhook succeeds
- **Why safe:** User can still be found later by email in stripe_payments

### 2. Duplicate Webhook (Replay)
- **What happens:** Idempotency check detects duplicate, skips processing
- **Why safe:** No duplicate payments logged

### 3. Payment Pending (Not Paid Yet)
- **What happens:** Payment logged with status='pending', subscriber still marked converted
- **Why safe:** Status can be updated when payment completes

### 4. ESP Sync Fails (Resend/Flodesk Down)
- **What happens:** Error logged, webhook still succeeds
- **Why safe:** Payment logged, can retry ESP sync later

### 5. Missing Columns (paid_blueprint_purchased)
- **What happens:** Only updates existing columns, logs deferral message
- **Why safe:** PR-3 will add columns and update logic

---

## 📋 Acceptance Criteria

Before deploying to production, verify:

- [ ] Test purchase completes without errors
- [ ] stripe_payments row created with amount_cents=4700
- [ ] product_type='paid_blueprint' and payment_type='paid_blueprint'
- [ ] metadata includes customer_email and session_id
- [ ] NO credits granted (credit_transactions has 0 rows)
- [ ] blueprint_subscribers.converted_to_user=TRUE
- [ ] Resend contact tagged with "paid-blueprint"
- [ ] Flodesk contact tagged with "paid-blueprint"
- [ ] Duplicate webhook does not create duplicate payment
- [ ] Logs show: "Paid blueprint purchase flags deferred until PR-3 migration"

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Feature Flag (Fastest)
```sql
UPDATE admin_feature_flags
SET is_enabled = FALSE
WHERE flag_name = 'paid_blueprint_enabled';
```

### Option 2: Stripe Price Deactivation
- Go to Stripe Dashboard → Products → Archive price
- Prevents new checkouts, existing data safe

### Option 3: Code Revert
```bash
git revert <commit-hash>
```

**Impact:** Existing purchases still logged, new purchases blocked at checkout

---

## 🎯 Why This Approach is Safe

1. **Isolated Logic:** New handler does not touch existing product types
2. **Read-Only on Critical Tables:** Only updates blueprint_subscribers (non-critical)
3. **No Schema Changes:** Works with existing database structure
4. **Idempotent:** Duplicate webhooks handled safely
5. **Fail-Safe:** Errors logged but don't break webhook
6. **Reversible:** Can disable via feature flag or Stripe

---

## 📈 What's Next

### PR-3: Schema + Generation (Next)
- Add 6 columns to blueprint_subscribers
- Create generation API
- Batch photo generation (10 at a time)
- Store 30 photo URLs in JSONB

### PR-4: Delivery Email
- Email template with gallery link
- Trigger on generation complete
- Click tracking

### PR-5: Checkout Page
- Landing page with CTA
- Stripe checkout integration
- Promo code support

### PR-6: Gallery UI
- Display 30 photos
- Download buttons
- Upsell to Studio

---

## 💬 Questions to Ask Before Deploying

1. **Is the Stripe product created at $47?**
   - Go to Stripe Dashboard → Products
   - Confirm price: $47.00 USD
   - Copy price ID → Set in `.env.local` as `STRIPE_PAID_BLUEPRINT_PRICE_ID`

2. **Is the webhook endpoint configured?**
   - Go to Stripe Dashboard → Webhooks
   - Confirm endpoint: `https://sselfie.ai/api/webhooks/stripe`
   - Confirm event: `checkout.session.completed` is enabled

3. **Do we have test blueprint subscribers?**
   - Check: `SELECT COUNT(*) FROM blueprint_subscribers;`
   - If 0, create a test subscriber first

---

## ✅ Ready to Deploy

**Checklist:**
- [x] Code written and linted (no errors)
- [x] Testing guide created
- [x] Edge cases handled
- [x] Rollback plan documented
- [ ] Stripe product created at $47
- [ ] Price ID in `.env.local`
- [ ] Test purchase completed successfully
- [ ] Sandra approves deployment

---

**Bottom Line:** PR-2 is a small, safe change that logs paid blueprint purchases in your database. It does NOT generate photos, send emails, or change any UI. Those come in PR-3, PR-4, PR-5.

**Risk:** 🟢 Low  
**Effort:** 🟢 Low (120 lines, 1 file)  
**Impact:** 🟢 Foundation for paid blueprint feature

---

**Next Step:** Test with Stripe CLI, verify database, then deploy to production. 🚀
