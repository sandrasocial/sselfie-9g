/**
 * Script to create Stripe discount codes for email campaigns
 * 
 * Creates:
 * - BLUEPRINT10: $10 off (for Blueprint Day 14 email)
 * - WELCOMEBACK15: $15 off (for Welcome Back Day 14 email)
 * 
 * Run with: pnpm exec tsx scripts/create-email-discount-codes.ts
 */

import Stripe from "stripe"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const stripeKey = process.env.STRIPE_SECRET_KEY

if (!stripeKey) {
  console.error("❌ Error: STRIPE_SECRET_KEY environment variable is required")
  process.exit(1)
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-11-20.acacia",
})

const isTestMode = stripeKey.startsWith("sk_test_")

async function createDiscountCode(
  code: string,
  amountOff: number,
  name: string,
  description: string,
  expiresInDays?: number,
) {
  try {
    console.log(`\n🎟️  Creating discount code: ${code}`)

    // Create coupon
    const couponParams: Stripe.CouponCreateParams = {
      id: code,
      amount_off: amountOff * 100, // Convert to cents
      currency: "usd",
      duration: "once", // One-time use
      name: name,
      metadata: {
        campaign: "email_automation",
        description: description,
      },
    }

    // Add expiration if specified
    if (expiresInDays) {
      couponParams.redeem_by = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60
    }

    const coupon = await stripe.coupons.create(couponParams)

    console.log(`✅ Coupon created: ${coupon.id}`)
    console.log(`   Discount: $${amountOff} off`)
    console.log(`   Duration: ${coupon.duration}`)
    if (coupon.redeem_by) {
      console.log(`   Expires: ${new Date(coupon.redeem_by * 1000).toLocaleDateString()}`)
    }

    // Create promotion code for easy customer use
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code,
      metadata: {
        campaign: "email_automation",
        description: description,
      },
    })

    console.log(`✅ Promotion code created: ${promotionCode.code}`)
    console.log(`   Active: ${promotionCode.active}`)

    return { coupon, promotionCode }
  } catch (error: any) {
    if (error.code === "resource_already_exists") {
      console.log(`⚠️  Coupon "${code}" already exists - skipping creation`)
      
      // Try to retrieve existing coupon
      try {
        const existingCoupon = await stripe.coupons.retrieve(code)
        console.log(`   Found existing coupon: ${existingCoupon.name}`)
        
        // Check if promotion code exists
        const promotionCodes = await stripe.promotionCodes.list({
          code: code,
          limit: 1,
        })
        
        if (promotionCodes.data.length > 0) {
          console.log(`   Found existing promotion code: ${promotionCodes.data[0].code}`)
          return { coupon: existingCoupon, promotionCode: promotionCodes.data[0] }
        } else {
          // Create promotion code for existing coupon
          const promotionCode = await stripe.promotionCodes.create({
            coupon: code,
            code: code,
            metadata: {
              campaign: "email_automation",
              description: description,
            },
          })
          console.log(`   Created promotion code: ${promotionCode.code}`)
          return { coupon: existingCoupon, promotionCode }
        }
      } catch (retrieveError) {
        console.error(`   Error retrieving existing coupon:`, retrieveError)
        return null
      }
    } else {
      console.error(`❌ Error creating ${code}:`, error.message)
      throw error
    }
  }
}

async function createAllDiscountCodes() {
  console.log("\n" + "=".repeat(60))
  console.log("🎟️  CREATING STRIPE DISCOUNT CODES FOR EMAIL CAMPAIGNS")
  console.log("=".repeat(60))

  if (isTestMode) {
    console.log("\n⚠️  WARNING: You are in TEST MODE")
    console.log("   These codes will be created in Stripe Test Mode")
    console.log("   Switch to LIVE mode for production codes\n")
  } else {
    console.log("\n✅ LIVE MODE - Creating production discount codes\n")
  }

  const codes = [
    {
      code: "BLUEPRINT10",
      amountOff: 10,
      name: "Blueprint Day 14 - $10 Off",
      description: "$10 off first photoshoot for Blueprint subscribers (Day 14 email offer)",
      expiresInDays: 30, // Valid for 30 days
    },
    {
      code: "WELCOMEBACK15",
      amountOff: 15,
      name: "Welcome Back Day 14 - $15 Off",
      description: "$15 off first purchase for returning users (Welcome Back Day 14 email offer)",
      expiresInDays: 30, // Valid for 30 days
    },
  ]

  const results = []

  for (const codeConfig of codes) {
    const result = await createDiscountCode(
      codeConfig.code,
      codeConfig.amountOff,
      codeConfig.name,
      codeConfig.description,
      codeConfig.expiresInDays,
    )
    results.push({ ...codeConfig, result })
  }

  console.log("\n" + "=".repeat(60))
  console.log("✅ DISCOUNT CODES CREATION COMPLETE")
  console.log("=".repeat(60))

  console.log("\n📋 SUMMARY:")
  results.forEach(({ code, amountOff, result }) => {
    if (result) {
      console.log(`   ✓ ${code}: $${amountOff} off - ${result.promotionCode.code}`)
    } else {
      console.log(`   ✗ ${code}: Failed to create`)
    }
  })

  console.log("\n📝 USAGE:")
  console.log("   These codes can be used at Stripe checkout")
  console.log("   Customers enter the code in the promotion code field")
  console.log("   Codes are already configured in checkout sessions (allow_promotion_codes: true)")

  console.log("\n📧 EMAIL INTEGRATION:")
  console.log("   - BLUEPRINT10: Use in win-back-offer.tsx template (Day 14)")
  console.log("   - WELCOMEBACK15: Use in welcome-back Day 14 email")

  console.log("\n✅ All discount codes are ready to use!\n")
}

createAllDiscountCodes()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
