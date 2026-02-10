import Stripe from "stripe"

// Define products inline to avoid import issues
const PRICING_PRODUCTS = [
  {
    id: "one_time_session",
    name: "One-Time SSELFIE Session",
    description: "Professional Instagram Photos in 2 Hours. No Photographer Needed.",
    type: "one_time_session",
    priceInCents: 4900, // $49
    credits: 70,
  },
  {
    id: "sselfie_studio_membership",
    name: "Content Creator Studio",
    description: "Stop Scrambling for Content Every Week. Unlimited Photos + Videos + Feed Planning.",
    type: "sselfie_studio_membership",
    priceInCents: 7900, // $79/month
    credits: 150,
  },
  {
    id: "brand_studio_membership",
    name: "Brand Studio",
    description: "Your Complete AI Content Team. Everything You Need to Run a Premium Brand.",
    type: "brand_studio_membership",
    priceInCents: 14900, // $149/month
    credits: 300,
  },
]

const CREDIT_PACKAGES = [
  {
    id: "credits_50",
    name: "50 Credits",
    description: "Top up your account with 50 credits",
    credits: 50,
    priceInCents: 1900, // $19
  },
  {
    id: "credits_100",
    name: "100 Credits",
    description: "Top up your account with 100 credits",
    credits: 100,
    priceInCents: 3500, // $35
  },
  {
    id: "credits_250",
    name: "250 Credits",
    description: "Top up your account with 250 credits",
    credits: 250,
    priceInCents: 7900, // $79
  },
]

function getStripeClient() {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim()
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required")
  }
  return new Stripe(key)
}

async function syncStripeProducts() {
  console.log("🔄 Syncing Stripe products...")

  try {
    const stripe = getStripeClient()

    console.log("\n📋 Checking for existing products...")
    const existingProducts = await stripe.products.list({ limit: 100 })
    const existingProductMap = new Map(
      existingProducts.data.map((p) => [p.metadata.product_id || p.metadata.package_id, p]),
    )

    // Sync main pricing products (One-Time Session & Studio Membership)
    for (const product of PRICING_PRODUCTS) {
      console.log(`\n📦 Processing: ${product.name}`)

      let stripeProduct = existingProductMap.get(product.id)

      if (stripeProduct) {
        console.log(`ℹ️  Product already exists: ${stripeProduct.id}`)
        stripeProduct = await stripe.products.update(stripeProduct.id, {
          name: product.name,
          description: product.description,
          metadata: {
            product_id: product.id,
            product_type: product.type,
            credits: product.credits.toString(),
          },
        })
        console.log(`✅ Product updated: ${stripeProduct.id}`)
      } else {
        // Create or update product
        stripeProduct = await stripe.products.create({
          name: product.name,
          description: product.description,
          metadata: {
            product_id: product.id,
            product_type: product.type,
            credits: product.credits.toString(),
          },
        })
        console.log(`✅ Product created: ${stripeProduct.id}`)
      }

      const existingPrices = await stripe.prices.list({
        product: stripeProduct.id,
        limit: 10,
      })

      const existingPrice = existingPrices.data.find((p) => p.active && p.unit_amount === product.priceInCents)

      if (existingPrice) {
        console.log(`ℹ️  Price already exists: ${existingPrice.id}`)
        console.log(`   Env variable: STRIPE_${product.id.toUpperCase()}_PRICE_ID=${existingPrice.id}`)
      } else {
        const priceData: Stripe.PriceCreateParams = {
          product: stripeProduct.id,
          currency: "usd",
          unit_amount: product.priceInCents,
          metadata: {
            product_id: product.id,
          },
        }

        // Add recurring data for subscriptions
        if (product.type === "sselfie_studio_membership") {
          priceData.recurring = {
            interval: "month",
          }
        }

        const stripePrice = await stripe.prices.create(priceData)

        console.log(`✅ Price created: ${stripePrice.id}`)
        console.log(`   Add to .env: STRIPE_${product.id.toUpperCase()}_PRICE_ID=${stripePrice.id}`)
      }
    }

    // Sync credit packages
    console.log("\n💳 Processing Credit Packages...")
    for (const pkg of CREDIT_PACKAGES) {
      console.log(`\n📦 Processing: ${pkg.name}`)

      let stripeProduct = existingProductMap.get(pkg.id)

      if (stripeProduct) {
        console.log(`ℹ️  Product already exists: ${stripeProduct.id}`)
        stripeProduct = await stripe.products.update(stripeProduct.id, {
          name: pkg.name,
          description: pkg.description,
          metadata: {
            package_id: pkg.id,
            credits: pkg.credits.toString(),
            product_type: "credit_topup",
          },
        })
        console.log(`✅ Product updated: ${stripeProduct.id}`)
      } else {
        stripeProduct = await stripe.products.create({
          name: pkg.name,
          description: pkg.description,
          metadata: {
            package_id: pkg.id,
            credits: pkg.credits.toString(),
            product_type: "credit_topup",
          },
        })
        console.log(`✅ Product created: ${stripeProduct.id}`)
      }

      const existingPrices = await stripe.prices.list({
        product: stripeProduct.id,
        limit: 10,
      })

      const existingPrice = existingPrices.data.find((p) => p.active && p.unit_amount === pkg.priceInCents)

      if (existingPrice) {
        console.log(`ℹ️  Price already exists: ${existingPrice.id}`)
        console.log(`   Env variable: STRIPE_${pkg.id.toUpperCase()}_PRICE_ID=${existingPrice.id}`)
      } else {
        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          currency: "usd",
          unit_amount: pkg.priceInCents,
          metadata: {
            package_id: pkg.id,
          },
        })

        console.log(`✅ Price created: ${stripePrice.id}`)
        console.log(`   Add to .env: STRIPE_${pkg.id.toUpperCase()}_PRICE_ID=${stripePrice.id}`)
      }
    }

    console.log("\n✨ Stripe products synced successfully!")
    console.log("\n📝 Next steps:")
    console.log("1. Copy the Price IDs above")
    console.log("2. Add them to your Vercel environment variables")
    console.log("3. Redeploy your application")
  } catch (error) {
    console.error("❌ Error syncing Stripe products:", error)
    throw error
  }
}

function shouldRunCli() {
  const entry = process.argv[1] || ""
  return entry.endsWith("/scripts/sync-stripe-products.ts") || entry.endsWith("\\scripts\\sync-stripe-products.ts")
}

// Only run automatically when executed as a script (CLI), never on import.
if (shouldRunCli()) {
  syncStripeProducts()
    .then(() => {
      console.log("\n✅ Done!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("\n❌ Failed:", error)
      process.exit(1)
    })
}

export { syncStripeProducts }
