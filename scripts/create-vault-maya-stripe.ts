// One-time setup: create the Vault Maya product + founder/standard monthly prices in Stripe.
// Idempotent: looks up an existing product by metadata key before creating.
// Usage: npx tsx scripts/create-vault-maya-stripe.ts

import Stripe from "stripe"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error("STRIPE_SECRET_KEY missing")
  process.exit(1)
}
const stripe = new Stripe(key)

async function main() {
  const existing = await stripe.products.search({
    query: "metadata['sselfie_product_type']:'vault_maya'",
  })
  let product = existing.data[0]
  if (product) {
    console.log(`Product exists: ${product.id}`)
  } else {
    product = await stripe.products.create({
      name: "Vault Maya",
      description:
        "Your own Maya chat for the Prompt Vault. Upload your selfie once, tap any vault look, and Maya makes the photo. 30 photos a month, new drops every week.",
      metadata: { sselfie_product_type: "vault_maya" },
    })
    console.log(`Product created: ${product.id}`)
  }

  const prices = await stripe.prices.list({ product: product.id, limit: 20 })
  const findPrice = (cents: number) =>
    prices.data.find(
      (p) =>
        p.unit_amount === cents &&
        p.currency === "usd" &&
        p.recurring?.interval === "month" &&
        p.active,
    )

  let founder = findPrice(1900)
  if (!founder) {
    founder = await stripe.prices.create({
      product: product.id,
      unit_amount: 1900,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: "Vault Maya founder $19/mo",
      metadata: { plan: "vault_maya_founder" },
    })
    console.log(`Founder price created: ${founder.id}`)
  } else {
    console.log(`Founder price exists: ${founder.id}`)
  }

  let standard = findPrice(2900)
  if (!standard) {
    standard = await stripe.prices.create({
      product: product.id,
      unit_amount: 2900,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: "Vault Maya standard $29/mo",
      metadata: { plan: "vault_maya_standard" },
    })
    console.log(`Standard price created: ${standard.id}`)
  } else {
    console.log(`Standard price exists: ${standard.id}`)
  }

  console.log("\nAdd to env:")
  console.log(`STRIPE_VAULT_MAYA_FOUNDER_PRICE_ID=${founder.id}`)
  console.log(`STRIPE_VAULT_MAYA_PRICE_ID=${standard.id}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
