# 🚨 BETA PRICING - QUICK FIX GUIDE

**3 users need immediate attention** → 30 minutes total

---

## USER 1: april@journu.com

### Issue:
- Paying $97/month (no discount)
- Should pay $48.50/month (50% off)

### Fix (Stripe Dashboard):
1. Go to: https://dashboard.stripe.com/subscriptions/sub_1SoZJbEVJvME7vkwJva5VPep
2. Click "Update subscription"
3. Scroll to "Coupon"
4. Add coupon: `BETA50`
5. Click "Update subscription"

### Fix (Stripe CLI):
```bash
stripe subscriptions update sub_1SoZJbEVJvME7vkwJva5VPep --coupon=BETA50
```

### Follow-up:
- Check billing history (how many months at $97?)
- Calculate refund: (months × $48.50)
- Send apology email + refund

---

## USER 2: clairemckay14@gmail.com

### Issue:
- Paying $99/month (no discount + wrong price!)
- Should pay $48.50/month (50% off)
- Already owed $4 from refund list

### Fix (Stripe Dashboard):
1. Go to: https://dashboard.stripe.com/subscriptions/sub_1SaKQdEVJvME7vkwLLznFb7F
2. Click "Update subscription"
3. Scroll to "Coupon"
4. Add coupon: `BETA50`
5. Click "Update subscription"

### Fix (Stripe CLI):
```bash
stripe subscriptions update sub_1SaKQdEVJvME7vkwLLznFb7F --coupon=BETA50
```

### Follow-up:
- Issue $4 refund (from previous audit)
- Check billing history (additional months at $99?)
- Calculate additional refund if needed
- Send apology email

---

## USER 3: webb@dalarnaseko.se

### Issue:
- Database has subscription but NO Stripe customer ID
- Can't verify discount status

### Fix:

**Step 1: Look up subscription in Stripe**
```bash
stripe subscriptions retrieve sub_1SlYkBEVJvME7vkwFbSeuTbv
```

**Step 2: Get customer ID from output**
Look for: `"customer": "cus_XXXXXXX"`

**Step 3: Update database**
```sql
UPDATE users
SET stripe_customer_id = 'cus_XXXXXXX'
WHERE email = 'webb@dalarnaseko.se'
-- OR WHERE id = '958fe2d6-7a88-4ef6-825d-554d2107292f'
```

**Step 4: Check if discount is applied**
- Look at subscription output from Step 1
- Check for `"discount": { "coupon": { "id": "BETA50" } }`

**Step 5: Apply discount if missing**
```bash
stripe subscriptions update sub_1SlYkBEVJvME7vkwFbSeuTbv --coupon=BETA50
```

---

## EMAIL TEMPLATE

Send to users after fixing:

```
Subject: SSELFIE: Your Beta Pricing Discount Applied

Hi [Name],

We discovered that your beta discount (50% off forever) wasn't properly applied to your Creator Studio subscription.

This has now been corrected:
- Your new monthly rate: $48.50/month (was $[old_amount])
- Discount: 50% off forever (locked in as a founding member)

We're also issuing a refund of $[amount] for the months you were charged incorrectly. This should appear in 5-10 business days.

We sincerely apologize for this oversight. Your support as a founding member means everything to us.

If you have any questions, please don't hesitate to reach out.

Thank you for your patience and understanding.

Best regards,
Sandra & The SSELFIE Team
```

---

## VERIFICATION

After fixing, verify the fix worked:

```bash
npx tsx scripts/stripe/verify-beta-pricing.ts
```

Look for:
- `beta_ok: true` for all 3 users
- No "missing_discount" errors

---

## REFUND CALCULATIONS

### april@journu.com
- Check Stripe invoices for `sub_1SoZJbEVJvME7vkwJva5VPep`
- Count months at $97 instead of $48.50
- Refund = months × $48.50

### clairemckay14@gmail.com
- Already identified: $4.00 (2 months × $2)
- Check if more months at $99 instead of $48.50
- Additional refund = months × $50.50
- Total refund = $4.00 + additional

---

## MONITORING (OPTIONAL)

Set up weekly check:

```bash
# Add to cron or run manually every week
npx tsx scripts/stripe/verify-beta-pricing.ts

# Alert if any "beta_ok: false" found
```

---

## POLICY DECISION

**Question:** If beta user cancels and re-subscribes, do they keep 50% off?

**Current behavior:** No (discount lost)

**Recommendation for case-by-case:**
- ✅ Payment failure → Restore discount
- 🤔 Voluntary cancel → Case-by-case review
- ❌ Abuse/fraud → No discount

**Document this policy for support team.**

---

## QUICK REFERENCE

**BETA50 Coupon:**
- 50% off
- Duration: forever
- Type: Subscription-level
- Manual application only (checkout disabled)

**Beta Users:**
- First 100 Creator Studio subscribers
- Currently: 34 users
- Correct: 31 users (91.2%)
- Need fix: 3 users

**Files:**
- Full report: `docs/_CANONICAL/BETA_PRICING_LIFETIME_VERIFICATION.md`
- CSV data: `docs/_CANONICAL/beta_pricing_status.csv`
- Verification script: `scripts/stripe/verify-beta-pricing.ts`

---

## DONE CHECKLIST

- [ ] Fix april@journu.com (apply BETA50)
- [ ] Fix clairemckay14@gmail.com (apply BETA50)
- [ ] Fix webb@dalarnaseko.se (add customer ID + apply BETA50)
- [ ] Calculate refunds for april@journu.com
- [ ] Issue refund to clairemckay14@gmail.com ($4 + additional)
- [ ] Send apology emails to 2-3 users
- [ ] Verify fixes with script
- [ ] Document re-subscribe policy
- [ ] (Optional) Set up weekly monitoring

**Estimated time:** 30-45 minutes

---

**Last updated:** 2026-01-19
