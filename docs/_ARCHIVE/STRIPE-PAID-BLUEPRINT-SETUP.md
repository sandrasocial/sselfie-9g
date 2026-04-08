# Stripe Paid Blueprint Product Setup

## Overview

This document explains how to create the Paid Blueprint product in Stripe using the API.

## Product Details

- **Product Name:** SSELFIE Brand Blueprint
- **Product ID (internal):** `paid_blueprint`
- **Price:** $47.00 (one-time payment)
- **Type:** One-time payment (not a subscription)
- **Credits:** 0 (photos stored directly, not via credits)

## Prerequisites

1. **Stripe Account:** You need access to your Stripe account
2. **API Key:** `STRIPE_SECRET_KEY` environment variable must be set
3. **Node.js:** Script requires Node.js and TypeScript execution

## Method 1: Using the Script (Recommended)

### Step 1: Run the Creation Script

```bash
npx tsx scripts/create-paid-blueprint-product.ts
```

Or if you have tsx installed globally:

```bash
tsx scripts/create-paid-blueprint-product.ts
```

### Step 2: What the Script Does

1. ✅ Checks if the product already exists (by metadata `product_id`)
2. ✅ Creates the product if it doesn't exist
3. ✅ Updates the product if it exists but needs changes
4. ✅ Checks for existing prices
5. ✅ Creates a new price ($47 one-time) if needed
6. ✅ Outputs the Price ID for environment variable setup

### Step 3: Copy the Price ID

The script will output:

```
STRIPE_PAID_BLUEPRINT_PRICE_ID=price_xxxxxxxxxxxxx
```

### Step 4: Set Environment Variable

**Local Development (.env.local):**
```bash
STRIPE_PAID_BLUEPRINT_PRICE_ID=price_xxxxxxxxxxxxx
```

**Vercel Production:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `STRIPE_PAID_BLUEPRINT_PRICE_ID` = `price_xxxxxxxxxxxxx`
3. Redeploy your application

## Method 2: Manual Creation via Stripe Dashboard

If you prefer to create it manually:

### Step 1: Create Product

1. Go to Stripe Dashboard → Products → Add Product
2. **Name:** `SSELFIE Brand Blueprint`
3. **Description:** `30 custom photos based on your brand strategy`
4. Click "Add product"

### Step 2: Add Price

1. Click "Add price" on the product
2. **Pricing model:** One-time
3. **Price:** `$47.00`
4. **Currency:** USD
5. Click "Add price"

### Step 3: Add Metadata

1. Go to product settings
2. Add metadata:
   - `product_id` = `paid_blueprint`
   - `product_type` = `paid_blueprint`
   - `credits` = `0`

### Step 4: Copy Price ID

1. Copy the Price ID (starts with `price_`)
2. Set it as `STRIPE_PAID_BLUEPRINT_PRICE_ID` in your environment variables

## Verification

### Check Product Exists

Run the script again - it should detect the existing product:

```bash
npx tsx scripts/create-paid-blueprint-product.ts
```

Expected output:
```
ℹ️  Product already exists: prod_xxxxxxxxxxxxx
ℹ️  Price already exists: price_xxxxxxxxxxxxx
```

### Check Environment Variable

Verify the environment variable is set:

```bash
# Local
cat .env.local | grep STRIPE_PAID_BLUEPRINT_PRICE_ID

# Or check in code
console.log(process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID)
```

### Test Checkout Flow

1. Navigate to `/paid-blueprint`
2. Click "Get My 30 Photos"
3. Should redirect to checkout without errors
4. Checkout should show $47.00

## Troubleshooting

### Error: "STRIPE_SECRET_KEY not set"

**Solution:** Set the environment variable:
```bash
export STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
# Or add to .env.local
```

### Error: "Product already exists but metadata doesn't match"

**Solution:** The script will update the product automatically. If issues persist:
1. Check Stripe Dashboard for the product
2. Manually update metadata to match:
   - `product_id` = `paid_blueprint`
   - `product_type` = `paid_blueprint`
   - `credits` = `0`

### Error: "Price ID not found" in checkout

**Solution:** 
1. Verify `STRIPE_PAID_BLUEPRINT_PRICE_ID` is set correctly
2. Check that the price ID exists in Stripe Dashboard
3. Ensure you're using the correct Stripe mode (test vs live)

### Multiple Prices Created

**Solution:** The script checks for existing prices, but if multiple were created:
1. Go to Stripe Dashboard → Products → Your Product
2. Archive inactive prices (keep only the active one)
3. Use the active price ID in your environment variable

## API Capabilities

✅ **Can Create Product:** Yes - via `stripe.products.create()`
✅ **Can Create Price:** Yes - via `stripe.prices.create()`
✅ **Can Check Existence:** Yes - via `stripe.products.list()` and metadata filtering
✅ **Can Update Product:** Yes - via `stripe.products.update()`
✅ **Idempotent:** Yes - script checks before creating

## Code Reference

- **Product Config:** `lib/products.ts` → `PRICING_PRODUCTS` array
- **Checkout Logic:** `app/actions/landing-checkout.ts` → `createLandingCheckoutSession()`
- **Script:** `scripts/create-paid-blueprint-product.ts`

## Related Files

- `scripts/sync-stripe-products.ts` - Syncs all products (doesn't include paid_blueprint yet)
- `app/checkout/blueprint/page.tsx` - Checkout route that uses the price ID
- `lib/products.ts` - Product configuration
