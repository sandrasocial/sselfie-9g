# PR-3 Quick Reference: What Changed

**Date:** January 9, 2026  
**Status:** ✅ Complete

---

## 📝 Files Changed (3 Total)

### Created (2)
1. `/scripts/migrations/add-paid-blueprint-tracking.sql` - Adds 6 columns
2. `/scripts/repair-paid-blueprint-converted-flag.sql` - Optional repair script

### Modified (1)
3. `/app/api/webhooks/stripe/route.ts` - Updates paid_blueprint handler

---

## 🗄️ Database Changes

### New Columns (6)
```sql
paid_blueprint_purchased BOOLEAN DEFAULT FALSE
paid_blueprint_purchased_at TIMESTAMPTZ
paid_blueprint_stripe_payment_id TEXT
paid_blueprint_photo_urls JSONB DEFAULT '[]'::jsonb
paid_blueprint_generated BOOLEAN DEFAULT FALSE
paid_blueprint_generated_at TIMESTAMPTZ
```

### New Indexes (3)
- `idx_blueprint_paid_purchased` - Fast lookup of buyers
- `idx_blueprint_paid_pending_generation` - Find pending generations
- `idx_blueprint_paid_email` - Email-based lookups

---

## 🔧 Webhook Changes

### What It Does Now
When `product_type = 'paid_blueprint'` AND `payment_status = 'paid'`:

```typescript
UPDATE blueprint_subscribers
SET 
  paid_blueprint_purchased = TRUE,
  paid_blueprint_purchased_at = NOW(),
  paid_blueprint_stripe_payment_id = ${paymentIntentId},
  updated_at = NOW()
WHERE email = ${customerEmail}
```

### What It Does NOT Do
- ❌ Does NOT set `converted_to_user` (per instructions)
- ❌ Does NOT set `converted_at`
- ❌ Does NOT grant credits
- ❌ Does NOT process if `payment_status !== 'paid'`

---

## 🧪 Quick Test

```bash
# 1. Run migration
psql $DATABASE_URL -f scripts/migrations/add-paid-blueprint-tracking.sql

# 2. Test webhook
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.product_type=paid_blueprint \
  --add checkout_session:customer_email=test@example.com \
  --add checkout_session:payment_status=paid

# 3. Verify
psql $DATABASE_URL -c "
  SELECT email, paid_blueprint_purchased, converted_to_user 
  FROM blueprint_subscribers 
  WHERE email = 'test@example.com';
"
# Expected: paid_blueprint_purchased=TRUE, converted_to_user=FALSE
```

---

## ✅ Success Criteria

- [x] Migration runs without errors
- [x] 6 columns added to blueprint_subscribers
- [x] 3 indexes created
- [x] Webhook updates paid_blueprint columns when paid
- [x] converted_to_user remains FALSE
- [x] No credits granted
- [x] Unpaid sessions skipped

---

## 🚫 Out of Scope

**NOT in PR-3:**
- Generation API
- Delivery emails
- UI changes
- Email sequences

**Coming next:** PR-4 (generation), PR-5 (emails), PR-6 (UI)

---

## 🔄 Rollback

```sql
-- If needed, run the rollback section in the migration file
BEGIN;
ALTER TABLE blueprint_subscribers
  DROP COLUMN paid_blueprint_purchased,
  DROP COLUMN paid_blueprint_purchased_at,
  DROP COLUMN paid_blueprint_stripe_payment_id,
  DROP COLUMN paid_blueprint_photo_urls,
  DROP COLUMN paid_blueprint_generated,
  DROP COLUMN paid_blueprint_generated_at;
-- ... (see migration file for full rollback)
COMMIT;
```

---

**Full Details:** See `/docs/PR-3-IMPLEMENTATION-SUMMARY.md`
