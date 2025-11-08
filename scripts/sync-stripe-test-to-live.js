import Stripe from "stripe"

// Initialize Stripe with your key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})

async function syncProducts() {
  try {
    console.log("🔍 Reading current Stripe products...\n")

    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")
    console.log(`Mode: ${isTestMode ? "🧪 TEST MODE" : "🚀 LIVE MODE"}\n`)

    // Fetch all products
    const products = await stripe.products.list({ limit: 100 })

    console.log(`Found ${products.data.length} products:\n`)

    for (const product of products.data) {
      console.log(`📦 ${product.name}`)
      console.log(`   ID: ${product.id}`)
      console.log(`   Description: ${product.description || "N/A"}`)

      // Fetch prices for this product
      const prices = await stripe.prices.list({ product: product.id })

      console.log(`   Prices:`)
      for (const price of prices.data) {
        const amount = price.unit_amount / 100
        const currency = price.currency.toUpperCase()
        const interval = price.recurring ? ` / ${price.recurring.interval}` : " (one-time)"

        console.log(`   💰 $${amount} ${currency}${interval}`)
        console.log(`      Price ID: ${price.id}`)
      }
      console.log("")
    }

    if (isTestMode) {
      console.log("\n⚠️  You are in TEST MODE")
      console.log("📝 Save this information before switching to live mode!")
      console.log("\nNext steps:")
      console.log("1. Go to v0 Connect section and disconnect sandbox")
      console.log("2. Connect your live Stripe account")
      console.log("3. Run this script again to create products in live mode")
    } else {
      console.log("\n✅ You are in LIVE MODE")
      console.log("📋 Update these environment variables in v0 Vars section:")
      console.log("\nCopy these Price IDs to your environment variables:")

      for (const product of products.data) {
        const prices = await stripe.prices.list({ product: product.id })
        if (prices.data.length > 0) {
          const envVarName = product.name
            .toUpperCase()
            .replace(/\s+/g, "_")
            .replace(/[^A-Z0-9_]/g, "")
          console.log(`STRIPE_${envVarName}_PRICE_ID=${prices.data[0].id}`)
        }
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message)

    if (error.message.includes("No such")) {
      console.log("\n💡 This might be because products don't exist yet in this mode.")
      console.log("If you just switched modes, the products need to be created.")
    }
  }
}

syncProducts()
