import Stripe from "stripe"

// Check for required environment variable
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Error: STRIPE_SECRET_KEY environment variable is required")
  console.error("Please set it in your .env file or environment")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Define products inline to avoid import issues
const PRICING_PRODUCTS = [
  {
    id: "one_time_session",
    name: "One-Time SSELFIE Session",
    description: "A single session to create your premium AI-generated brand photos",
    type: "one_time_session",
    priceInCents: 4900, // $49
    credits: 50,
  },
  {
    id: "sselfie_studio_membership",
    name: "SSELFIE Studio Membership",
    description: "Full access to courses, monthly drops, bonuses, and ongoing photo generation",
    type: "sselfie_studio_membership",
    priceInCents: 9900, // $99/month
    credits: 200,
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

async function syncStripeProducts() {
  console.log("🔄 Syncing Stripe products...")

  try {
    // Sync main pricing products (One-Time Session & Studio Membership)
    for (const product of PRICING_PRODUCTS) {
      console.log(`\n📦 Processing: ${product.name}`)

      // Create or update product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: {
          product_id: product.id,
          product_type: product.type,
          credits: product.credits.toString(),
        },
      })

      console.log(`✅ Product created: ${stripeProduct.id}`)

      const priceData = {
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

    // Sync credit packages
    console.log("\n💳 Processing Credit Packages...")
    for (const pkg of CREDIT_PACKAGES) {
      console.log(`\n📦 Processing: ${pkg.name}`)

      const stripeProduct = await stripe.products.create({
        name: pkg.name,
        description: pkg.description,
        metadata: {
          package_id: pkg.id,
          credits: pkg.credits.toString(),
          product_type: "credit_topup",
        },
      })

      console.log(`✅ Product created: ${stripeProduct.id}`)

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

syncStripeProducts()
  .then(() => {
    console.log("\n✅ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error)
    process.exit(1)
  })

export { syncStripeProducts }
