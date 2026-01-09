# Paid Blueprint Environment Variable Setup - Complete

**Date:** 2026-01-09  
**Status:** ✅ Product Created | ✅ Local Env Set | ⚠️ Vercel Needs Manual Setup

---

## ✅ COMPLETED

### 1. **Stripe Product Created** ✅

**Product Details:**
- **Product ID:** `prod_TlHsG7jMnKkvV8`
- **Product Name:** SSELFIE Brand Blueprint
- **Price ID:** `price_1SnlJEEVJvME7vkw1thdr7WK`
- **Price:** $47.00 (one-time)
- **Mode:** Live (production)

**Created via:** `scripts/create-paid-blueprint-product.ts`

### 2. **Local Development Environment** ✅

**File:** `.env.local`

**Added:**
```bash
STRIPE_PAID_BLUEPRINT_PRICE_ID=price_1SnlJEEVJvME7vkw1thdr7WK
```

**Status:** ✅ Set and loaded by dotenv

**Verification:**
```bash
grep STRIPE_PAID_BLUEPRINT_PRICE_ID .env.local
```

---

## ⚠️ MANUAL STEP REQUIRED

### 3. **Vercel Environment Variables** ⚠️

**Status:** Needs to be set manually (Vercel CLI requires authentication)

**Price ID to Set:**
```
price_1SnlJEEVJvME7vkw1thdr7WK
```

### Option A: Using Vercel CLI (Recommended)

**Step 1: Authenticate**
```bash
vercel login
```

**Step 2: Set Environment Variable**

For **Production:**
```bash
echo "price_1SnlJEEVJvME7vkw1thdr7WK" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID production
```

For **Preview:**
```bash
echo "price_1SnlJEEVJvME7vkw1thdr7WK" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID preview
```

For **Development:**
```bash
echo "price_1SnlJEEVJvME7vkw1thdr7WK" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID development
```

**Or use the helper script:**
```bash
bash scripts/set-vercel-env-paid-blueprint.sh
```

### Option B: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. **Key:** `STRIPE_PAID_BLUEPRINT_PRICE_ID`
6. **Value:** `price_1SnlJEEVJvME7vkw1thdr7WK`
7. Select environments: **Production**, **Preview**, **Development**
8. Click **Save**
9. **Redeploy** your application

### Option C: Using VERCEL_TOKEN

If you have a Vercel token:

```bash
export VERCEL_TOKEN=your_token_here
echo "price_1SnlJEEVJvME7vkw1thdr7WK" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID production --token "$VERCEL_TOKEN"
echo "price_1SnlJEEVJvME7vkw1thdr7WK" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID preview --token "$VERCEL_TOKEN"
echo "price_1SnlJEEVJvME7vkw1thdr7WK" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID development --token "$VERCEL_TOKEN"
```

---

## ✅ VERIFICATION

### Local Development

**Check .env.local:**
```bash
grep STRIPE_PAID_BLUEPRINT_PRICE_ID .env.local
```

**Expected output:**
```
STRIPE_PAID_BLUEPRINT_PRICE_ID=price_1SnlJEEVJvME7vkw1thdr7WK
```

**Test in code:**
```typescript
console.log(process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID)
// Should output: price_1SnlJEEVJvME7vkw1thdr7WK
```

### Vercel Production

**Check via CLI:**
```bash
vercel env ls
```

**Check via Dashboard:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Look for `STRIPE_PAID_BLUEPRINT_PRICE_ID`
3. Should show: `price_1SnlJEEVJvME7vkw1thdr7WK`

**Test checkout flow:**
1. Navigate to `/paid-blueprint` on production
2. Click "Get My 30 Photos"
3. Should redirect to checkout without errors
4. Checkout should show $47.00

---

## 📋 SUMMARY

| Item | Status | Details |
|------|--------|---------|
| **Stripe Product** | ✅ Created | `prod_TlHsG7jMnKkvV8` |
| **Stripe Price** | ✅ Created | `price_1SnlJEEVJvME7vkw1thdr7WK` |
| **Local .env.local** | ✅ Set | Loaded by dotenv |
| **Vercel Production** | ⚠️ Manual | Needs to be set |
| **Vercel Preview** | ⚠️ Manual | Needs to be set |
| **Vercel Development** | ⚠️ Manual | Needs to be set |

---

## 🚀 NEXT STEPS

1. ✅ **Done:** Stripe product created
2. ✅ **Done:** Local environment variable set
3. ⚠️ **TODO:** Set Vercel environment variable (choose Option A, B, or C above)
4. ⚠️ **TODO:** Redeploy Vercel application after setting env var
5. ✅ **Test:** Verify checkout flow works

---

## 📝 FILES CREATED/MODIFIED

- ✅ `scripts/create-paid-blueprint-product.ts` - Product creation script (with dotenv support)
- ✅ `scripts/set-vercel-env-paid-blueprint.sh` - Helper script for Vercel CLI
- ✅ `.env.local` - Added `STRIPE_PAID_BLUEPRINT_PRICE_ID`
- ✅ `docs/STRIPE-PAID-BLUEPRINT-SETUP.md` - Setup documentation
- ✅ `docs/STRIPE-PAID-BLUEPRINT-ANALYSIS.md` - Analysis document
- ✅ `docs/PAID-BLUEPRINT-ENV-SETUP-COMPLETE.md` - This file

---

## 🔗 QUICK REFERENCE

**Price ID:** `price_1SnlJEEVJvME7vkw1thdr7WK`  
**Product ID:** `prod_TlHsG7jMnKkvV8`  
**Environment Variable:** `STRIPE_PAID_BLUEPRINT_PRICE_ID`

---

**Last Updated:** 2026-01-09
