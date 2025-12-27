# Loops Tags & User Groups Audit

**Date:** 2025-01-XX  
**Purpose:** Verify all email capture points are adding correct tags, user groups, and custom fields to Loops

## Summary Table

| Source | Tags Added | User Group | Custom Fields |
|--------|------------|------------|---------------|
| **Freebie** | `['freebie-guide', 'lead']` | `subscriber` (default) | `{ status: 'lead', product: 'sselfie-guide', journey: 'nurture', signupDate: YYYY-MM-DD }` |
| **Blueprint** | `['brand-blueprint', 'lead']` | `subscriber` (default) | `{ status: 'lead', product: 'sselfie-brand-blueprint', journey: 'nurture', signupDate: YYYY-MM-DD, business: string?, dreamClient: string?, struggle: string? }` |
| **Prompt Guide** | `['prompt-guide', emailListTag \|\| 'prompt-guide']` | `subscriber` (default) | `{ status: 'lead', product: emailListTag, journey: 'nurture' }` |
| **Stripe** | `['customer', 'paid', productTag]` + conditional `'beta-customer'` | `paid` (explicit) | `{ status: 'customer', product: productTag, journey: 'onboarding', converted: 'true', purchaseDate: YYYY-MM-DD, betaCustomer: 'true'? }` |

---

## Detailed Analysis by File

### File 1: `app/api/freebie/subscribe/route.ts`

**Location:** Lines 174-207

**syncContactToLoops() Call:**
```typescript
const loopsResult = await syncContactToLoops({
  email,
  name,
  source: 'freebie-subscriber',
  tags: ['freebie-guide', 'lead'],
  customFields: {
    status: 'lead',
    product: 'sselfie-guide',
    journey: 'nurture',
    signupDate: new Date().toISOString().split('T')[0]
  }
})
```

**Findings:**
- ✅ Tags are correct: `['freebie-guide', 'lead']`
- ✅ User group defaults to `'subscriber'` (handled by `syncContactToLoops` → `addOrUpdateLoopsContact`)
- ✅ Custom fields include: `status`, `product`, `journey`, `signupDate`
- ✅ All required fields present

---

### File 2: `app/api/blueprint/subscribe/route.ts`

**Location:** Lines 145-179

**syncContactToLoops() Call:**
```typescript
const loopsResult = await syncContactToLoops({
  email,
  name,
  source: 'blueprint-subscriber',
  tags: ['brand-blueprint', 'lead'],
  customFields: {
    status: 'lead',
    product: 'sselfie-brand-blueprint',
    journey: 'nurture',
    signupDate: new Date().toISOString().split('T')[0],
    business: formData?.business,
    dreamClient: formData?.dreamClient,
    struggle: formData?.struggle
  }
})
```

**Findings:**
- ✅ Tags are correct: `['brand-blueprint', 'lead']`
- ✅ User group defaults to `'subscriber'`
- ✅ Custom fields include: `status`, `product`, `journey`, `signupDate`, plus form-specific fields (`business`, `dreamClient`, `struggle`)
- ✅ All required fields present

---

### File 3: `app/api/prompt-guide/subscribe/route.ts`

**Location:** Lines 108-137

**syncContactToLoops() Call:**
```typescript
const loopsResult = await syncContactToLoops({
  email,
  name,
  source: 'prompt-guide-subscriber',
  tags: ['prompt-guide', emailListTag || 'prompt-guide'],
  customFields: {
    status: 'lead',
    product: emailListTag,
    journey: 'nurture'
  }
})
```

**Findings:**
- ⚠️ **ISSUE 1:** Tags can have duplicates. If `emailListTag` is `'prompt-guide'`, tags become `['prompt-guide', 'prompt-guide']`
- ⚠️ **ISSUE 2:** Missing `signupDate` custom field (inconsistent with Freebie and Blueprint)
- ✅ User group defaults to `'subscriber'`
- ✅ Custom fields include: `status`, `product`, `journey`
- ❌ Missing: `signupDate`

**Recommended Fix:**
1. Deduplicate tags: `tags: [...new Set(['prompt-guide', emailListTag || 'prompt-guide'])]`
2. Add `signupDate` to custom fields for consistency

---

### File 4: `app/api/webhooks/stripe/route.ts`

**Location:** Lines 226-250

**syncContactToLoops() Call:**
```typescript
const loopsTags = ['customer', 'paid', productTag]
if (process.env.RESEND_BETA_SEGMENT_ID) {
  loopsTags.push('beta-customer')
}

const loopsResult = await syncContactToLoops({
  email: customerEmail,
  name: firstName,
  source: 'stripe-checkout',
  tags: loopsTags,
  userGroup: 'paid',
  customFields: {
    status: 'customer',
    product: productTag,
    journey: 'onboarding',
    converted: 'true',
    purchaseDate: new Date().toISOString().split('T')[0],
    ...(process.env.RESEND_BETA_SEGMENT_ID && { betaCustomer: 'true' })
  }
})
```

**Findings:**
- ✅ Tags are correct: `['customer', 'paid', productTag]` + conditional `'beta-customer'`
- ✅ User group is explicitly set to `'paid'` (correct for paying customers)
- ✅ Custom fields include: `status`, `product`, `journey`, `converted`, `purchaseDate`, plus conditional `betaCustomer`
- ✅ All required fields present
- ✅ Correctly differentiates paying customers from leads

---

## Issues Found

### ❌ **Issue 1: Prompt Guide - Duplicate Tags**
**File:** `app/api/prompt-guide/subscribe/route.ts`  
**Line:** 115  
**Problem:** If `emailListTag` is `'prompt-guide'`, tags become `['prompt-guide', 'prompt-guide']`  
**Impact:** Redundant tags in Loops  
**Fix:** Deduplicate tags array

### ⚠️ **Issue 2: Prompt Guide - Missing signupDate**
**File:** `app/api/prompt-guide/subscribe/route.ts`  
**Line:** 116-120  
**Problem:** Missing `signupDate` custom field (inconsistent with Freebie and Blueprint)  
**Impact:** Inconsistent data structure across subscription sources  
**Fix:** Add `signupDate: new Date().toISOString().split('T')[0]` to customFields

---

## Recommendations

1. **Fix Prompt Guide tags deduplication**
   ```typescript
   tags: [...new Set(['prompt-guide', emailListTag || 'prompt-guide'])]
   ```

2. **Add signupDate to Prompt Guide custom fields** (for consistency)
   ```typescript
   customFields: {
     status: 'lead',
     product: emailListTag,
     journey: 'nurture',
     signupDate: new Date().toISOString().split('T')[0]
   }
   ```

3. **Consider standardizing custom field names:**
   - Currently uses: `signupDate` (Freebie, Blueprint) vs `purchaseDate` (Stripe)
   - Recommendation: Use `signupDate` for all leads, `purchaseDate` for customers

4. **Verify Loops user groups match expectations:**
   - `subscriber` - Default for all leads (correct ✅)
   - `paid` - Explicitly set for Stripe customers (correct ✅)

---

## Tag Reference Guide

### Lead Tags (Subscriptions)
- `freebie-guide` - Free selfie guide subscribers
- `brand-blueprint` - Brand blueprint subscribers
- `prompt-guide` - Prompt guide subscribers
- `lead` - Generic lead tag (all subscription sources)

### Customer Tags (Purchases)
- `customer` - Generic customer tag
- `paid` - Paid customer tag
- `beta-customer` - Beta program customer (conditional)
- `one-time-session` - One-time session purchase
- `studio-membership` - Studio membership purchase
- `brand-studio` - Brand studio membership purchase
- `credit-topup` - Credit top-up purchase

---

## User Group Reference

From `lib/loops/client.ts`:
- `LOOPS_AUDIENCES.ALL_SUBSCRIBERS` = `'subscriber'` (default for leads)
- `LOOPS_AUDIENCES.PAID_CUSTOMERS` = `'paid'` (explicit for Stripe customers)
- `LOOPS_AUDIENCES.STUDIO_MEMBERS` = `'studio-member'`
- `LOOPS_AUDIENCES.COLD_USERS` = `'cold'`
- `LOOPS_AUDIENCES.ENGAGED_USERS` = `'engaged'`

