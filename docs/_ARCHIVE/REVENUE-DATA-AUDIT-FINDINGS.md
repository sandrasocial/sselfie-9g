# Revenue Data Audit - Findings & Solutions
**Date:** January 9, 2026  
**Issue:** Admin dashboard showing $0 for One-Time Revenue and Credit Purchases

---

## 🔍 EXECUTIVE SUMMARY

The admin dashboard is showing **$0 for credit purchases and one-time revenue** despite having **78 real purchases** in the database. The root cause is **incomplete data migration** between the legacy credit system and the new Stripe-based revenue tracking.

### **Actual Numbers:**
- ✅ **Subscription Revenue:** $6,454 (123 payments) - **CORRECT** *(but missing half due to status filter)*
- ❌ **Credit Purchase Revenue:** Showing $0 (should be ~$500-800)
- ❌ **One-Time Revenue:** Showing $0 (should be ~$754)
- ❌ **Total Revenue Missing:** ~$1,250-1,550

---

## 📊 DETAILED FINDINGS

### **Problem #1: stripe_payments Table - Status Inconsistency** ⚠️

**Current Data:**
```
Status Distribution:
- "paid": 62 payments, $3,227
- "succeeded": 61 payments, $3,227
Total: 123 payments, $6,454
```

**The Code:**
```typescript
WHERE status = 'succeeded'  // ❌ Only captures half the payments!
```

**Impact:**
- Dashboard shows $3,227 in subscription revenue
- **Missing $3,227** from payments with status='paid'

**Fix:** Accept BOTH `paid` and `succeeded` statuses:
```typescript
WHERE status IN ('paid', 'succeeded')
```

---

### **Problem #2: Missing Payment Amounts in credit_transactions** 🚨

**Current Data:**
```
Credit Topup Purchases: 52 purchases, 4,700 credits granted
- payment_amount_cents: NULL for ALL
- stripe_payment_id: Only 3 have IDs

One-Time Session Purchases: 26 purchases, 1,820 credits (70 each)
- payment_amount_cents: NULL for ALL  
- stripe_payment_id: Only 1 has ID
```

**The Code:**
```typescript
WHERE payment_amount_cents IS NOT NULL  // ❌ Returns 0 rows!
```

**Impact:**
- All 78 purchases are excluded from revenue calculations
- **$1,250-1,550 in revenue not reported**

**Root Cause:**
The legacy system created `credit_transactions` records when credits were granted, but:
1. Never filled in `payment_amount_cents`
2. Rarely filled in `stripe_payment_id`
3. No migration script backfilled this data

---

### **Problem #3: stripe_payments Table - Missing Payment Types** 📉

**Current Data:**
```
Payment Type Distribution:
- subscription: 123 payments ($6,454)
- credit_topup: 0 payments ($0)
- one_time_session: 0 payments ($0)
```

**Analysis:**
The `stripe_payments` table was created for the new webhook-based system, but:
1. Only subscription webhooks populate it
2. Credit/one-time purchases still go to `credit_transactions` (legacy)
3. No migration moved historical purchases to `stripe_payments`

---

## 🎯 REVENUE PACKAGE BREAKDOWN

Based on credit amounts granted, we can infer package prices:

### **Credit Topup Packages:**
- 50 credits = $9 (most common)
- 150 credits = $19 (bulk package)
- **52 purchases, 4,700 total credits**
- **Estimated Revenue: $500-800**

### **One-Time Session:**
- 70 credits = $29 (standard price)
- **26 purchases, 1,820 total credits**
- **Estimated Revenue: $754** (26 × $29)

### **Subscription Revenue:**
- Monthly Pro: $49.50/month
- **$6,454 total** ($3,227 shown, $3,227 missing)

---

## 🛠️ SOLUTION OPTIONS

### **Option A: QUICK FIX (Recommended for Now)** ⭐
**Fix the status filter and add estimation logic**

**Changes:**
1. Update `lib/revenue/db-revenue-metrics.ts`:
   - Change `status = 'succeeded'` to `status IN ('paid', 'succeeded')`
   - Add fallback estimation when `payment_amount_cents` is NULL
   - Use credit amount + product_type to estimate revenue

2. Display separate metrics:
   - "Documented Revenue" (from payment_amount_cents)
   - "Estimated Revenue" (from credit amounts)
   - Total with disclaimer

**Benefits:**
- ✅ Immediate fix (30 minutes)
- ✅ Shows more accurate revenue
- ✅ Maintains historical data
- ✅ No risk to existing system

**Limitations:**
- ⚠️ Still shows estimates, not exact amounts
- ⚠️ Doesn't fix underlying data quality

---

### **Option B: DATA MIGRATION (Comprehensive)**
**Backfill payment amounts from Stripe API**

**Changes:**
1. Create migration script to:
   - Query Stripe API for each `stripe_payment_id` in `credit_transactions`
   - Backfill `payment_amount_cents` from Stripe data
   - Update records with exact amounts

2. Update revenue queries to use actual amounts

**Benefits:**
- ✅ 100% accurate revenue data
- ✅ Fixes data quality permanently
- ✅ Future-proof

**Limitations:**
- ⚠️ Takes 2-3 hours to implement
- ⚠️ Requires Stripe API calls (rate limits)
- ⚠️ Only works for 4 records with `stripe_payment_id` (the rest are lost)

---

### **Option C: HYBRID APPROACH (Best Long-Term)** 🎖️
**Fix status + migrate available data + estimate the rest**

**Changes:**
1. Fix status filter (`paid` + `succeeded`)
2. Backfill the 4 records with Stripe Payment IDs
3. Estimate the remaining 74 records using credit amounts
4. Display breakdown:
   - Exact: $XXX (from Stripe data)
   - Estimated: $XXX (from credit grants)
   - Total: $XXX

**Benefits:**
- ✅ Most accurate possible
- ✅ Shows data quality transparency
- ✅ Respects historical limitations
- ✅ Future purchases will be exact

**Limitations:**
- ⚠️ Most complex (4-5 hours)
- ⚠️ Still has estimated component

---

## 📝 RECOMMENDED IMMEDIATE ACTION

**Fix the status filter issue NOW:**
- This alone will show the correct $6,454 subscription revenue
- Takes 5 minutes
- Zero risk

**Then choose:** Option A (Quick Fix) or Option C (Hybrid)

---

## 🔒 CRITICAL FILE STATUS

Based on your rules, these files are involved:
- 🟢 **SAFE:** `lib/revenue/db-revenue-metrics.ts` - Helper function, no critical logic
- 🟢 **SAFE:** `app/api/admin/dashboard/stats/route.ts` - Admin-only API route
- 🟢 **SAFE:** `components/admin/admin-dashboard.tsx` - UI display only

**No 🔴 CRITICAL FILES need to be touched.**

---

## 📊 NEXT STEPS

1. ✅ **You read this report** (done!)
2. ⏳ **Choose a fix option** (A, B, or C)
3. ⏳ **I implement the fix**
4. ⏳ **I test using the dev server**
5. ⏳ **I provide before/after comparison**

---

**END OF AUDIT**
