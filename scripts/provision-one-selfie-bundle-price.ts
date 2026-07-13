/**
 * Idempotently provisions the live Stripe product/price for the attended
 * July 2026 One Selfie revenue event. It never creates a subscription price.
 *
 * Usage: pnpm exec tsx scripts/provision-one-selfie-bundle-price.ts --live
 */
import { config } from "dotenv"
import Stripe from "stripe"

config({ path: ".env.local" })

const apiKey = process.env.STRIPE_SECRET_KEY?.trim()
const liveRequested = process.argv.includes("--live")

if (!liveRequested) {
  throw new Error("Refusing to provision without the explicit --live flag")
}
if (!apiKey?.startsWith("sk_live_")) {
  throw new Error("A live STRIPE_SECRET_KEY is required")
}

const stripe = new Stripe(apiKey)
const productKey = "selfie_visibility_bundle"
const closesAt = "2026-07-15T16:00:00.000Z"

async function main() {
  const existingProducts = await stripe.products.search({
    query: `metadata[\"sselfie_key\"]:\"${productKey}\"`,
    limit: 10,
  })

  let product = existingProducts.data.find((candidate) => !candidate.deleted)
  if (!product) {
    product = await stripe.products.create({
      name: "One Selfie Visibility Bundle",
      description:
        "One-time bundle with lifetime Starter Kit, Presets, Editing Masterclass, Branded by SSELFIE, and Prompt Vault, plus a fixed 30-day SUITE pass with 200 credits and no renewal.",
      metadata: {
        sselfie_key: productKey,
        product_type: productKey,
        campaign: "one_selfie_visibility_48h",
        closes_at: closesAt,
        recurring: "false",
      },
    })
  } else {
    product = await stripe.products.update(product.id, {
      active: true,
      name: "One Selfie Visibility Bundle",
      description:
        "One-time bundle with lifetime Starter Kit, Presets, Editing Masterclass, Branded by SSELFIE, and Prompt Vault, plus a fixed 30-day SUITE pass with 200 credits and no renewal.",
      metadata: {
        ...product.metadata,
        sselfie_key: productKey,
        product_type: productKey,
        campaign: "one_selfie_visibility_48h",
        closes_at: closesAt,
        recurring: "false",
      },
    })
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
  let price = prices.data.find(
    (candidate) =>
      candidate.type === "one_time" &&
      candidate.currency === "usd" &&
      candidate.unit_amount === 9_700,
  )

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: 9_700,
      nickname: "One Selfie Visibility Bundle — July 2026",
      metadata: {
        sselfie_key: productKey,
        product_type: productKey,
        campaign: "one_selfie_visibility_48h",
        closes_at: closesAt,
        recurring: "false",
      },
    })
  }

  console.log(`PRODUCT_ID=${product.id}`)
  console.log(`PRICE_ID=${price.id}`)
  console.log(`LIVEMODE=${price.livemode}`)
  console.log(`AMOUNT=${price.unit_amount} ${price.currency.toUpperCase()}`)
  console.log(`TYPE=${price.type}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
