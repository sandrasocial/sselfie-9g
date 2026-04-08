# PR-2 Visual Summary: What Happens When Someone Buys

**For Sandra | January 9, 2026**

---

## 🎬 The Flow (Step-by-Step)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CUSTOMER COMPLETES CHECKOUT                                  │
│    • Stripe Checkout page                                       │
│    • Product: SSELFIE Brand Blueprint                           │
│    • Price: $47.00                                              │
│    • Email: sandra@example.com                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. STRIPE SENDS WEBHOOK                                         │
│    • Event: checkout.session.completed                          │
│    • Metadata: { product_type: 'paid_blueprint' }               │
│    • To: https://sselfie.ai/api/webhooks/stripe                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. YOUR SERVER RECEIVES WEBHOOK                                 │
│    ✅ Verifies Stripe signature                                 │
│    ✅ Checks idempotency (no duplicates)                        │
│    ✅ Detects product_type = 'paid_blueprint'                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. LOGS PAYMENT TO DATABASE                                     │
│    Table: stripe_payments                                       │
│    • stripe_payment_id: pi_1234567890                           │
│    • amount_cents: 4700 ($47)                                   │
│    • product_type: paid_blueprint                               │
│    • customer_email: sandra@example.com                         │
│    • is_test_mode: false                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. TAGS CUSTOMER IN EMAIL SYSTEMS                               │
│    Resend:                                                       │
│    • Tag: paid-blueprint                                        │
│    • Status: customer                                           │
│    Flodesk:                                                      │
│    • Tag: paid-blueprint                                        │
│    • Custom field: product = paid-blueprint                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. UPDATES BLUEPRINT SUBSCRIBER                                 │
│    Table: blueprint_subscribers                                 │
│    • converted_to_user: TRUE                                    │
│    • converted_at: 2026-01-09 12:34:56                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. LOGS CONFIRMATION                                            │
│    Console:                                                      │
│    [v0] 💎 Paid Blueprint purchase from sandra@example.com      │
│    [v0] ✅ Stored paid blueprint payment in stripe_payments     │
│    [v0] ℹ️ Paid blueprint: NO credits granted                   │
│    [v0] ✅ Marked blueprint subscriber as converted             │
│    [v0] ℹ️ Purchase flags deferred until PR-3 migration         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. RETURNS SUCCESS TO STRIPE                                    │
│    • HTTP 200 OK                                                │
│    • Stripe marks webhook as delivered                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Before vs After

### Before Purchase

**stripe_payments:**
```
(No rows for this customer)
```

**blueprint_subscribers:**
```
email:              sandra@example.com
converted_to_user:  FALSE
converted_at:       NULL
```

**credit_transactions:**
```
(No rows for paid blueprint)
```

---

### After Purchase

**stripe_payments:**
```
stripe_payment_id:     pi_1234567890
stripe_customer_id:    cus_ABC123
user_id:               NULL ← No account required
amount_cents:          4700 ← $47.00
currency:              usd
status:                succeeded
payment_type:          paid_blueprint
product_type:          paid_blueprint
description:           SSELFIE Brand Blueprint - 30 Custom Photos
metadata:              { customer_email, session_id, product_type }
is_test_mode:          false
payment_date:          2026-01-09 12:34:56
```

**blueprint_subscribers:**
```
email:              sandra@example.com
converted_to_user:  TRUE ← Updated!
converted_at:       2026-01-09 12:34:56 ← Updated!
```

**credit_transactions:**
```
(Still no rows - this is correct!)
```

---

## ✅ What Happens

| Action | Status | Details |
|--------|--------|---------|
| **Payment Logged** | ✅ YES | Stored in stripe_payments table |
| **Revenue Tracked** | ✅ YES | Amount: $47.00 (4700 cents) |
| **Customer Tagged** | ✅ YES | Resend + Flodesk with "paid-blueprint" |
| **Subscriber Updated** | ✅ YES | converted_to_user = TRUE |
| **Conversion Tracked** | ✅ YES | Marked in email sequences |
| **Idempotency** | ✅ YES | Duplicate webhooks ignored |

---

## ❌ What Does NOT Happen

| Action | Status | Why Not |
|--------|--------|---------|
| **Credits Granted** | ❌ NO | Paid blueprint uses direct photo storage |
| **User Account Created** | ❌ NO | Blueprint uses token-based access |
| **Photos Generated** | ❌ NO | That's PR-3 (generation API) |
| **Delivery Email Sent** | ❌ NO | That's PR-4 (email template) |
| **UI Changes** | ❌ NO | That's PR-5 (checkout page) |
| **Schema Changes** | ❌ NO | That's PR-3 (add 6 columns) |

---

## 🔍 How to Verify It Worked

### Check 1: Payment Logged

```sql
SELECT 
  stripe_payment_id,
  amount_cents / 100.0 as amount_dollars,
  product_type,
  metadata->>'customer_email' as email,
  payment_date
FROM stripe_payments
WHERE product_type = 'paid_blueprint'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
```
stripe_payment_id | amount_dollars | product_type   | email                | payment_date
------------------|----------------|----------------|----------------------|-------------------
pi_1234567890     | 47.00          | paid_blueprint | sandra@example.com   | 2026-01-09 12:34:56
```

---

### Check 2: Subscriber Updated

```sql
SELECT 
  email,
  converted_to_user,
  converted_at
FROM blueprint_subscribers
WHERE email = 'sandra@example.com';
```

**Expected:**
```
email                | converted_to_user | converted_at
---------------------|-------------------|-------------------
sandra@example.com   | true              | 2026-01-09 12:34:56
```

---

### Check 3: NO Credits Granted

```sql
SELECT COUNT(*) 
FROM credit_transactions
WHERE description ILIKE '%paid blueprint%';
```

**Expected:**
```
count
-----
0
```

---

## 🚨 Edge Cases Handled

### Scenario 1: Duplicate Webhook (Replay)

**What happens:**
- Idempotency check detects duplicate event ID
- Skips processing
- Returns 200 OK
- Logs: "⚠️ Duplicate event detected: evt_XXX - skipping processing"

**Result:** No duplicate payment logged ✅

---

### Scenario 2: Email Not in blueprint_subscribers

**What happens:**
- Payment still logged to stripe_payments
- Warning logged: "⚠️ Email not found in blueprint_subscribers"
- Webhook still succeeds (200 OK)

**Result:** Payment tracked, can link later ✅

---

### Scenario 3: Payment Pending (Not Paid Yet)

**What happens:**
- Payment logged with status='pending'
- Subscriber still marked as converted
- When payment completes, status updates to 'succeeded'

**Result:** Safe to process early ✅

---

### Scenario 4: Resend/Flodesk Down

**What happens:**
- Payment still logged
- Error logged: "⚠️ Flodesk sync failed"
- Webhook still succeeds (200 OK)
- Can retry ESP sync later

**Result:** Payment not lost ✅

---

## 🎯 Success Criteria (Simple)

PR-2 is working if:

1. ✅ Test purchase completes without errors
2. ✅ stripe_payments has a new row with amount_cents=4700
3. ✅ blueprint_subscribers.converted_to_user=TRUE
4. ✅ credit_transactions has 0 rows for paid blueprint
5. ✅ Logs show "NO credits granted (photos stored directly)"

---

## 🔄 If Something Goes Wrong

### Option 1: Disable Feature (Fastest)
```sql
UPDATE admin_feature_flags
SET is_enabled = FALSE
WHERE flag_name = 'paid_blueprint_enabled';
```
**Impact:** New checkouts blocked, existing data safe

---

### Option 2: Archive Stripe Price
1. Go to Stripe Dashboard
2. Products → SSELFIE Brand Blueprint
3. Click "Archive" on the $47 price

**Impact:** New checkouts blocked, existing data safe

---

### Option 3: Revert Code
```bash
git revert <commit-hash>
git push origin main
```
**Impact:** Webhook handler removed, existing data safe

---

## 📈 What's Next (After PR-2)

### PR-3: Schema + Generation (Week 1)
- Add 6 columns to blueprint_subscribers
- Create generation API
- Batch photo generation (10 at a time)
- Store 30 photo URLs

### PR-4: Delivery Email (Week 1)
- Email template with gallery link
- Trigger on generation complete
- Click tracking

### PR-5: Checkout Page (Week 2)
- Landing page with CTA
- Stripe checkout integration
- Promo code support

### PR-6: Gallery UI (Week 2)
- Display 30 photos
- Download buttons
- Upsell to Studio

---

## 💬 Plain English Summary

**What PR-2 does:**
When someone buys the paid blueprint for $47, your server logs the payment in the database and tags them in your email systems. It does NOT generate photos or send emails yet—that comes in PR-3 and PR-4.

**Why it's safe:**
This is just logging. It doesn't change any existing features, doesn't grant credits, and doesn't create user accounts. If something goes wrong, you can disable it with one SQL command.

**What you need to do:**
1. Create the Stripe product at $47
2. Set the price ID in your environment variables
3. Run a test purchase
4. Check the database to confirm it worked
5. Approve deployment

**Time to test:** 15 minutes  
**Time to deploy:** 5 minutes  
**Risk:** Very low (just logging)

---

## ✅ Ready to Test?

**Quick Test Command:**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.product_type=paid_blueprint \
  --add checkout_session:customer_email=test@example.com
```

**Check Database:**
```sql
SELECT * FROM stripe_payments WHERE product_type = 'paid_blueprint';
```

**Expected:** 1 row with amount_cents=4700

---

**Questions?** Ask your AI team. We're here to help! 🚀
