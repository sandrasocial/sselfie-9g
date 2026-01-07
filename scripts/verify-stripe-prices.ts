#!/usr/bin/env tsx
/**
 * Verify Stripe Price IDs match expected pricing
 */

import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const EXPECTED_PRICES = {
  studio_membership: {
    priceId: process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "price_1SmIRaEVJvME7vkwMo5vSLzf",
    expectedAmount: 9700, // $97
    expectedInterval: "month" as const,
  },
  one_time_session: {
    priceId: process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID || "price_1SRH7mEVJvME7vkw5vMjZC4s",
    expectedAmount: 4900, // $49
    expectedInterval: null, // one-time
  },
}

async function verifyPrice(
  name: string,
  priceId: string,
  expectedAmount: number,
  expectedInterval: "month" | null
) {
  try {
    console.log(`\n📦 Verifying ${name}...`)
    console.log(`   Price ID: ${priceId}`)
    
    const price = await stripe.prices.retrieve(priceId, {
      expand: ['product'],
    })
    
    const actualAmount = price.unit_amount || 0
    const actualInterval = price.recurring?.interval || null
    const product = typeof price.product === 'object' ? price.product : null
    
    console.log(`   Amount: $${(actualAmount / 100).toFixed(2)} (Expected: $${(expectedAmount / 100).toFixed(2)})`)
    console.log(`   Interval: ${actualInterval || 'one-time'} (Expected: ${expectedInterval || 'one-time'})`)
    if (product) {
      console.log(`   Product: ${product.name} (${product.id})`)
    }
    
    const amountCorrect = actualAmount === expectedAmount
    const intervalCorrect = actualInterval === expectedInterval
    
    if (amountCorrect && intervalCorrect) {
      console.log(`   ✅ ${name} is correctly configured!`)
      return true
    } else {
      console.error(`   ❌ ${name} configuration mismatch!`)
      if (!amountCorrect) {
        console.error(`      Amount mismatch: Got $${(actualAmount / 100).toFixed(2)}, expected $${(expectedAmount / 100).toFixed(2)}`)
      }
      if (!intervalCorrect) {
        console.error(`      Interval mismatch: Got ${actualInterval || 'one-time'}, expected ${expectedInterval || 'one-time'}`)
      }
      return false
    }
  } catch (error: any) {
    console.error(`   ❌ Error retrieving price: ${error.message}`)
    return false
  }
}

async function main() {
  console.log("=".repeat(80))
  console.log("🔍 STRIPE PRICE ID VERIFICATION")
  console.log("=".repeat(80))
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ STRIPE_SECRET_KEY not set in environment")
    process.exit(1)
  }
  
  const keyType = process.env.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "LIVE" : "TEST"
  console.log(`\nEnvironment: ${keyType} MODE`)
  
  let allPassed = true
  
  const studioResult = await verifyPrice(
    "Creator Studio Membership",
    EXPECTED_PRICES.studio_membership.priceId,
    EXPECTED_PRICES.studio_membership.expectedAmount,
    EXPECTED_PRICES.studio_membership.expectedInterval
  )
  
  const oneTimeResult = await verifyPrice(
    "One-Time Session",
    EXPECTED_PRICES.one_time_session.priceId,
    EXPECTED_PRICES.one_time_session.expectedAmount,
    EXPECTED_PRICES.one_time_session.expectedInterval
  )
  
  if (!studioResult || !oneTimeResult) {
    allPassed = false
  }
  
  console.log("\n" + "=".repeat(80))
  if (allPassed) {
    console.log("✅ ALL STRIPE PRICES VERIFIED - Ready for testing!")
    console.log("\n📋 Next Steps:")
    console.log("   1. Run manual tests using PRICING_SYSTEM_TEST_GUIDE.md")
    console.log("   2. Test checkout flow with test card: 4242 4242 4242 4242")
    console.log("   3. Verify webhook events in Stripe Dashboard")
    process.exit(0)
  } else {
    console.error("❌ SOME PRICES MISMATCH - Please fix in Stripe Dashboard")
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})


