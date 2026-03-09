/**
 * Script to create the Selfie Guide product in Stripe.
 *
 * Usage:
 *   npx tsx scripts/create-selfie-guide-product.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import Stripe from "stripe"

config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY environment variable is required")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})

const SELFIE_GUIDE_PRODUCT = {
  id: "selfie_guide",
  name: "Selfie Guide",
  description: "The SSELFIE Selfie Guide - turn one good selfie into your brand",
  priceInCents: 1700,
  currency: "eur",
  type: "selfie_guide",
}

async function createSelfieGuideProduct() {
  const existingProducts = await stripe.products.list({ limit: 100 })
  const existingProduct =
    existingProducts.data.find((product) => product.metadata.product_id === SELFIE_GUIDE_PRODUCT.id) ||
    existingProducts.data.find((product) => product.name === SELFIE_GUIDE_PRODUCT.name)

  const stripeProduct = existingProduct
    ? await stripe.products.update(existingProduct.id, {
        name: SELFIE_GUIDE_PRODUCT.name,
        description: SELFIE_GUIDE_PRODUCT.description,
        metadata: {
          product_id: SELFIE_GUIDE_PRODUCT.id,
          product_type: SELFIE_GUIDE_PRODUCT.type,
        },
      })
    : await stripe.products.create({
        name: SELFIE_GUIDE_PRODUCT.name,
        description: SELFIE_GUIDE_PRODUCT.description,
        metadata: {
          product_id: SELFIE_GUIDE_PRODUCT.id,
          product_type: SELFIE_GUIDE_PRODUCT.type,
        },
      })

  const existingPrices = await stripe.prices.list({
    product: stripeProduct.id,
    limit: 20,
  })

  const existingPrice = existingPrices.data.find(
    (price) =>
      price.active &&
      price.currency === SELFIE_GUIDE_PRODUCT.currency &&
      price.unit_amount === SELFIE_GUIDE_PRODUCT.priceInCents &&
      !price.recurring,
  )

  const stripePrice =
    existingPrice ||
    (await stripe.prices.create({
      product: stripeProduct.id,
      currency: SELFIE_GUIDE_PRODUCT.currency,
      unit_amount: SELFIE_GUIDE_PRODUCT.priceInCents,
      metadata: {
        product_id: SELFIE_GUIDE_PRODUCT.id,
      },
    }))

  console.log(`STRIPE_PRICE_SELFIE_GUIDE=${stripePrice.id}`)

  return {
    productId: stripeProduct.id,
    priceId: stripePrice.id,
  }
}

createSelfieGuideProduct()
  .then(({ productId, priceId }) => {
    console.log(`Selfie Guide product ready: ${productId}`)
    console.log(`Price ID: ${priceId}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error("Failed to create Selfie Guide product:", error)
    process.exit(1)
  })
