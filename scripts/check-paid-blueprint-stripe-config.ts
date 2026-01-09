import Stripe from "stripe"
import { config } from "dotenv"

// Load environment variables from .env.local
config({ path: ".env.local" })

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Error: STRIPE_SECRET_KEY environment variable is required")
  process.exit(1)
}

if (!process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID) {
  console.error("❌ Error: STRIPE_PAID_BLUEPRINT_PRICE_ID environment variable is not set")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const priceId = process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID

console.log("=".repeat(80))
console.log("🔍 DIAGNOSING PAID BLUEPRINT STRIPE CONFIGURATION")
console.log("=".repeat(80))
console.log(`\n📋 Environment Variable:`)
console.log(`   STRIPE_PAID_BLUEPRINT_PRICE_ID=${priceId}`)
console.log(`\n🔍 Checking Stripe...\n`)

async function diagnose() {
  try {
    // 1. Retrieve the price
    console.log("1️⃣ Retrieving Price Object...")
    const price = await stripe.prices.retrieve(priceId)
    
    console.log(`   ✅ Price ID: ${price.id}`)
    console.log(`   ✅ Active: ${price.active}`)
    console.log(`   ✅ Amount: $${(price.unit_amount || 0) / 100}`)
    console.log(`   ✅ Currency: ${price.currency}`)
    console.log(`   ✅ Type: ${price.type}`)
    console.log(`   ✅ Recurring: ${price.recurring ? "Yes" : "No"}`)
    
    // 2. Retrieve the product
    console.log(`\n2️⃣ Retrieving Product Object...`)
    const productId = typeof price.product === "string" ? price.product : price.product.id
    const product = await stripe.products.retrieve(productId)
    
    console.log(`   ✅ Product ID: ${product.id}`)
    console.log(`   ✅ Product Name: "${product.name}"`)
    console.log(`   ✅ Product Description: "${product.description || "(none)"}"`)
    console.log(`   ✅ Active: ${product.active}`)
    console.log(`   ✅ Metadata:`, product.metadata)
    
    // 3. Check what emails Stripe will send
    console.log(`\n3️⃣ Stripe Receipt Email Configuration:`)
    console.log(`   ℹ️  Stripe automatically sends receipt emails for successful payments`)
    console.log(`   ℹ️  Receipt will show:`)
    console.log(`      - Product Name: "${product.name}"`)
    console.log(`      - Product Description: "${product.description || "(none)"}"`)
    console.log(`      - Price: $${(price.unit_amount || 0) / 100}`)
    
    // 4. Check our app's email
    console.log(`\n4️⃣ Our App's Email:`)
    console.log(`   ✅ We send: "paid-blueprint-delivery" email`)
    console.log(`   ✅ Subject: "Your SSELFIE Brand Blueprint is ready 📸"`)
    console.log(`   ✅ Content: Delivery email with access link`)
    
    // 5. Compare expected vs actual
    console.log(`\n5️⃣ EXPECTED vs ACTUAL:`)
    const expectedName = "SSELFIE Brand Blueprint"
    const expectedDescription = "30 custom photos based on your brand strategy"
    const expectedPrice = 4700 // $47
    
    console.log(`\n   Expected Product Name: "${expectedName}"`)
    console.log(`   Actual Product Name:   "${product.name}"`)
    console.log(`   Match: ${product.name === expectedName ? "✅ YES" : "❌ NO"}`)
    
    console.log(`\n   Expected Description: "${expectedDescription}"`)
    console.log(`   Actual Description:   "${product.description || "(none)"}"`)
    console.log(`   Match: ${product.description === expectedDescription ? "✅ YES" : "❌ NO"}`)
    
    console.log(`\n   Expected Price: $${expectedPrice / 100}`)
    console.log(`   Actual Price:   $${(price.unit_amount || 0) / 100}`)
    console.log(`   Match: ${price.unit_amount === expectedPrice ? "✅ YES" : "❌ NO"}`)
    
    // 6. Summary
    console.log(`\n${"=".repeat(80)}`)
    console.log(`📊 SUMMARY`)
    console.log(`${"=".repeat(80)}`)
    
    const nameMatch = product.name === expectedName
    const descMatch = product.description === expectedDescription
    const priceMatch = price.unit_amount === expectedPrice
    
    if (nameMatch && descMatch && priceMatch) {
      console.log(`\n✅ All configurations match!`)
      console.log(`\n💡 If users are receiving wrong emails, check:`)
      console.log(`   1. Are they receiving Stripe's automatic receipt? (This is normal)`)
      console.log(`   2. Are they receiving our delivery email? (Should be sent by webhook)`)
      console.log(`   3. Check webhook logs for "paid-blueprint-delivery" email sends`)
    } else {
      console.log(`\n❌ MISMATCH DETECTED!`)
      if (!nameMatch) {
        console.log(`   ⚠️  Product name doesn't match`)
      }
      if (!descMatch) {
        console.log(`   ⚠️  Product description doesn't match`)
      }
      if (!priceMatch) {
        console.log(`   ⚠️  Price doesn't match`)
      }
      console.log(`\n💡 Fix: Update the Stripe product to match expected values`)
      console.log(`   Or update the expected values in this script if intentional`)
    }
    
    console.log(`\n${"=".repeat(80)}\n`)
    
  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message)
    if (error.code === "resource_missing") {
      console.error(`\n💡 The price ID "${priceId}" doesn't exist in Stripe!`)
      console.error(`   Check your STRIPE_PAID_BLUEPRINT_PRICE_ID environment variable`)
    }
    process.exit(1)
  }
}

diagnose()
  .then(() => {
    console.log("✅ Diagnosis complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Failed:", error)
    process.exit(1)
  })
