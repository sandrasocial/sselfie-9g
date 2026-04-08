# Stripe Paid Blueprint Product - API Analysis

**Date:** 2026-01-09  
**Purpose:** Analyze ability to create Paid Blueprint product in Stripe via API

---

## ✅ ANALYSIS RESULTS

### **YES - I Can Create the Product via API**

The codebase has all necessary tools and patterns to create the Paid Blueprint product in Stripe using the API.

---

## 🔍 FINDINGS

### 1. **Existing Infrastructure** ✅

**Stripe Client Setup:**
- ✅ `lib/stripe.ts` - Stripe client configured with API version `2024-11-20.acacia`
- ✅ Environment variable: `STRIPE_SECRET_KEY` (required)
- ✅ Proper error handling and initialization

**Product Sync Scripts:**
- ✅ `scripts/sync-stripe-products.ts` - Existing script that creates/updates Stripe products
- ✅ Pattern: Check existence → Create or Update → Create Price
- ✅ Uses metadata to track products (`product_id`, `product_type`)

### 2. **Product Configuration** ✅

**From `lib/products.ts`:**
```typescript
{
  id: "paid_blueprint",
  name: "Brand Blueprint - Paid",
  displayName: "SSELFIE Brand Blueprint",
  description: "30 custom photos based on your brand strategy",
  priceInCents: 4700, // $47 one-time
  type: "paid_blueprint",
  credits: 0, // No credits granted - photos stored directly
}
```

### 3. **API Capabilities** ✅

**Can Create Product:**
- ✅ `stripe.products.create()` - Available
- ✅ Can set name, description, metadata
- ✅ Can track via metadata `product_id: "paid_blueprint"`

**Can Create Price:**
- ✅ `stripe.prices.create()` - Available
- ✅ Can set amount ($47.00), currency (USD)
- ✅ Can set as one-time payment (no recurring)

**Can Check Existence:**
- ✅ `stripe.products.list()` - Available
- ✅ Can filter by metadata to find existing product
- ✅ Can check for existing prices

**Can Update:**
- ✅ `stripe.products.update()` - Available
- ✅ Can update name, description, metadata if product exists

### 4. **Idempotency** ✅

**Safe to Run Multiple Times:**
- ✅ Script checks for existing product before creating
- ✅ Script checks for existing price before creating
- ✅ Updates existing product if metadata doesn't match
- ✅ Won't create duplicates

---

## 📝 WHAT I CREATED

### 1. **Creation Script** ✅

**File:** `scripts/create-paid-blueprint-product.ts`

**Features:**
- ✅ Checks if product exists (by metadata)
- ✅ Creates product if missing
- ✅ Updates product if exists but needs changes
- ✅ Checks for existing prices
- ✅ Creates price ($47 one-time) if missing
- ✅ Outputs Price ID for environment variable
- ✅ Clear error messages and troubleshooting tips

**Usage:**
```bash
npx tsx scripts/create-paid-blueprint-product.ts
```

### 2. **Documentation** ✅

**File:** `docs/STRIPE-PAID-BLUEPRINT-SETUP.md`

**Includes:**
- ✅ Step-by-step setup instructions
- ✅ Script usage guide
- ✅ Manual creation alternative
- ✅ Verification steps
- ✅ Troubleshooting guide
- ✅ Environment variable setup

---

## 🎯 CURRENT STATUS

### Product in Stripe: ❓ Unknown

**Need to Check:**
- Does the product exist in Stripe?
- Does a price exist for it?
- Is `STRIPE_PAID_BLUEPRINT_PRICE_ID` set?

### Code Ready: ✅ Yes

**Integration Points:**
- ✅ `app/actions/landing-checkout.ts` - Uses `STRIPE_PAID_BLUEPRINT_PRICE_ID`
- ✅ `app/checkout/blueprint/page.tsx` - Routes to checkout
- ✅ `lib/products.ts` - Product configuration defined
- ✅ Error handling for missing price ID

---

## 🚀 NEXT STEPS

### Option 1: Run the Script (Recommended)

```bash
# Make sure STRIPE_SECRET_KEY is set
export STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Run the script
npx tsx scripts/create-paid-blueprint-product.ts
```

**Expected Output:**
```
✅ Product created: prod_xxxxxxxxxxxxx
✅ Price created: price_xxxxxxxxxxxxx
STRIPE_PAID_BLUEPRINT_PRICE_ID=price_xxxxxxxxxxxxx
```

### Option 2: Manual Creation

1. Go to Stripe Dashboard
2. Create product: "SSELFIE Brand Blueprint"
3. Add price: $47.00 (one-time)
4. Add metadata: `product_id = paid_blueprint`
5. Copy Price ID
6. Set environment variable

### Option 3: Update Existing Sync Script

Add `paid_blueprint` to `scripts/sync-stripe-products.ts`:
```typescript
const PRICING_PRODUCTS = [
  // ... existing products ...
  {
    id: "paid_blueprint",
    name: "SSELFIE Brand Blueprint",
    description: "30 custom photos based on your brand strategy",
    type: "paid_blueprint",
    priceInCents: 4700,
    credits: 0,
  },
]
```

---

## ⚠️ IMPORTANT NOTES

### Environment Variables

**Required:**
- `STRIPE_SECRET_KEY` - For API access
- `STRIPE_PAID_BLUEPRINT_PRICE_ID` - For checkout (set after creation)

### Test vs Live Mode

**Script uses:**
- Test mode if `STRIPE_SECRET_KEY` starts with `sk_test_`
- Live mode if `STRIPE_SECRET_KEY` starts with `sk_live_`

**Important:** Create in test mode first, verify, then create in live mode.

### Price ID Format

**Expected format:** `price_xxxxxxxxxxxxx`

**Used in:**
- `app/actions/landing-checkout.ts` - Line 40
- `app/checkout/blueprint/page.tsx` - Error handling

---

## ✅ VERIFICATION CHECKLIST

After running the script:

- [ ] Product exists in Stripe Dashboard
- [ ] Price exists ($47.00, one-time)
- [ ] Metadata set correctly (`product_id: "paid_blueprint"`)
- [ ] `STRIPE_PAID_BLUEPRINT_PRICE_ID` environment variable set
- [ ] Checkout flow works (`/checkout/blueprint`)
- [ ] No errors in console when accessing paid blueprint page

---

## 📊 SUMMARY

| Capability | Status | Notes |
|------------|--------|-------|
| **Create Product** | ✅ Yes | Via `stripe.products.create()` |
| **Create Price** | ✅ Yes | Via `stripe.prices.create()` |
| **Check Existence** | ✅ Yes | Via `stripe.products.list()` + metadata |
| **Update Product** | ✅ Yes | Via `stripe.products.update()` |
| **Idempotent** | ✅ Yes | Script checks before creating |
| **Error Handling** | ✅ Yes | Clear error messages |
| **Documentation** | ✅ Yes | Setup guide created |
| **Script Ready** | ✅ Yes | `create-paid-blueprint-product.ts` |

---

## 🎯 CONCLUSION

**YES - I can create the Paid Blueprint product in Stripe using the API.**

The script is ready to run. It will:
1. Check if the product exists
2. Create it if missing
3. Create the price ($47 one-time)
4. Output the Price ID for environment variable setup

**Ready to execute when you are!**
