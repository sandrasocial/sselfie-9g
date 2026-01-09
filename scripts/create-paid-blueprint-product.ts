/**
 * Script to create the Paid Blueprint product in Stripe
 * 
 * This script:
 * 1. Checks if the product already exists
 * 2. Creates the product if it doesn't exist
 * 3. Creates a price ($47 one-time) for the product
 * 4. Outputs the Price ID for environment variable setup
 * 
 * Usage:
 *   npx tsx scripts/create-paid-blueprint-product.ts
 * 
 * Requirements:
 *   - STRIPE_SECRET_KEY environment variable must be set (in .env.local or environment)
 */

import { config } from "dotenv"
import { resolve } from "path"
import Stripe from "stripe"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

// Check for required environment variable
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Error: STRIPE_SECRET_KEY environment variable is required")
  console.error("Please set it in your .env file or environment")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})

// Product configuration from lib/products.ts
const PAID_BLUEPRINT_PRODUCT = {
  id: "paid_blueprint",
  name: "SSELFIE Brand Blueprint",
  description: "30 custom photos based on your brand strategy",
  priceInCents: 4700, // $47 one-time
  type: "paid_blueprint",
  credits: 0, // No credits granted - photos stored directly
}

async function createPaidBlueprintProduct() {
  console.log("🔄 Creating Paid Blueprint product in Stripe...\n")

  try {
    // Check if product already exists
    console.log("📋 Checking for existing products...")
    const existingProducts = await stripe.products.list({ limit: 100 })
    const existingProduct = existingProducts.data.find(
      (p) => p.metadata.product_id === PAID_BLUEPRINT_PRODUCT.id
    )

    let stripeProduct: Stripe.Product

    if (existingProduct) {
      console.log(`ℹ️  Product already exists: ${existingProduct.id}`)
      console.log(`   Name: ${existingProduct.name}`)
      
      // Update product to ensure it matches our config
      stripeProduct = await stripe.products.update(existingProduct.id, {
        name: PAID_BLUEPRINT_PRODUCT.name,
        description: PAID_BLUEPRINT_PRODUCT.description,
        metadata: {
          product_id: PAID_BLUEPRINT_PRODUCT.id,
          product_type: PAID_BLUEPRINT_PRODUCT.type,
          credits: PAID_BLUEPRINT_PRODUCT.credits.toString(),
        },
      })
      console.log(`✅ Product updated: ${stripeProduct.id}\n`)
    } else {
      // Create new product
      console.log("📦 Creating new product...")
      stripeProduct = await stripe.products.create({
        name: PAID_BLUEPRINT_PRODUCT.name,
        description: PAID_BLUEPRINT_PRODUCT.description,
        metadata: {
          product_id: PAID_BLUEPRINT_PRODUCT.id,
          product_type: PAID_BLUEPRINT_PRODUCT.type,
          credits: PAID_BLUEPRINT_PRODUCT.credits.toString(),
        },
      })
      console.log(`✅ Product created: ${stripeProduct.id}\n`)
    }

    // Check for existing prices
    console.log("💰 Checking for existing prices...")
    const existingPrices = await stripe.prices.list({
      product: stripeProduct.id,
      limit: 10,
    })

    // Find active price with matching amount
    const existingPrice = existingPrices.data.find(
      (p) => p.active && p.unit_amount === PAID_BLUEPRINT_PRODUCT.priceInCents && !p.recurring
    )

    let stripePrice: Stripe.Price

    if (existingPrice) {
      console.log(`ℹ️  Price already exists: ${existingPrice.id}`)
      console.log(`   Amount: $${(existingPrice.unit_amount || 0) / 100}`)
      stripePrice = existingPrice
    } else {
      // Create new price
      console.log("💰 Creating new price...")
      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        currency: "usd",
        unit_amount: PAID_BLUEPRINT_PRODUCT.priceInCents,
        metadata: {
          product_id: PAID_BLUEPRINT_PRODUCT.id,
        },
      })
      console.log(`✅ Price created: ${stripePrice.id}`)
      console.log(`   Amount: $${(stripePrice.unit_amount || 0) / 100}`)
    }

    // Output results
    console.log("\n" + "=".repeat(60))
    console.log("✨ Paid Blueprint product setup complete!")
    console.log("=".repeat(60))
    console.log("\n📝 Environment Variable:")
    console.log(`   STRIPE_PAID_BLUEPRINT_PRICE_ID=${stripePrice.id}`)
    console.log("\n📋 Product Details:")
    console.log(`   Product ID: ${stripeProduct.id}`)
    console.log(`   Product Name: ${stripeProduct.name}`)
    console.log(`   Price ID: ${stripePrice.id}`)
    console.log(`   Price: $${(stripePrice.unit_amount || 0) / 100} (one-time)`)
    console.log("\n✅ Next Steps:")
    console.log("1. Copy the Price ID above")
    console.log("2. Add it to your .env.local file:")
    console.log(`   STRIPE_PAID_BLUEPRINT_PRICE_ID=${stripePrice.id}`)
    console.log("3. Add it to Vercel environment variables")
    console.log("4. Redeploy your application")
    console.log("\n")

    return {
      productId: stripeProduct.id,
      priceId: stripePrice.id,
    }
  } catch (error: any) {
    console.error("\n❌ Error creating Paid Blueprint product:", error.message)
    
    if (error.type === "StripeAuthenticationError") {
      console.error("\n💡 Tip: Check that STRIPE_SECRET_KEY is set correctly")
    } else if (error.type === "StripeInvalidRequestError") {
      console.error("\n💡 Tip: Check that the product configuration is valid")
    }
    
    throw error
  }
}

// Run the script
createPaidBlueprintProduct()
  .then((result) => {
    console.log("✅ Script completed successfully!")
    console.log(`   Product ID: ${result.productId}`)
    console.log(`   Price ID: ${result.priceId}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
