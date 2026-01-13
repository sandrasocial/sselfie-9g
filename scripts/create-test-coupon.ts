/**
 * Create a test coupon code for paid_blueprint testing
 * 
 * This creates a 100% off coupon that can be used in Stripe checkout
 * Run with: npx tsx scripts/create-test-coupon.ts
 */

import Stripe from "stripe"
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set")
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-11-20.acacia",
})

async function createTestCoupon() {
  console.log("=".repeat(80))
  console.log("🎫 CREATING TEST COUPON CODE FOR PAID_BLUEPRINT")
  console.log("=".repeat(80))

  try {
    // Check if coupon already exists
    const existingCoupons = await stripe.coupons.list({
      limit: 100,
    })

    const testCouponId = "TEST100"
    const existingCoupon = existingCoupons.data.find(c => c.id === testCouponId)

    if (existingCoupon) {
      console.log(`\n✅ Coupon "${testCouponId}" already exists!`)
      console.log(`   ID: ${existingCoupon.id}`)
      console.log(`   Percent off: ${existingCoupon.percent_off}%`)
      console.log(`   Valid: ${existingCoupon.valid}`)
      console.log(`   Times redeemed: ${existingCoupon.times_redeemed}`)
      console.log(`   Max redemptions: ${existingCoupon.max_redemptions || "unlimited"}`)
      
      // Check if promotion code exists (search by code first, then by coupon)
      let promotionCodes = await stripe.promotionCodes.list({
        limit: 100,
        code: "TEST100",
      })

      // If not found by code, try by coupon
      if (promotionCodes.data.length === 0) {
        promotionCodes = await stripe.promotionCodes.list({
          limit: 100,
          coupon: testCouponId,
        })
      }

      if (promotionCodes.data.length > 0) {
        console.log(`\n✅ Promotion code(s) found:`)
        promotionCodes.data.forEach((promo, index) => {
          console.log(`   ${index + 1}. Code: "${promo.code}"`)
          console.log(`      Active: ${promo.active}`)
          console.log(`      Times redeemed: ${promo.times_redeemed}`)
          console.log(`      Max redemptions: ${promo.max_redemptions || "unlimited"}`)
        })
        console.log(`\n💡 Use this code in checkout: "${promotionCodes.data[0].code}"`)
      } else {
        console.log(`\n⚠️  No promotion code found. Creating one...`)
        
        try {
          // Create a promotion code for the coupon
          const promotionCode = await stripe.promotionCodes.create({
            coupon: testCouponId,
            code: "TEST100",
            active: true,
          })
          
          console.log(`\n✅ Created promotion code: "${promotionCode.code}"`)
          console.log(`   Use this code in checkout: "${promotionCode.code}"`)
        } catch (promoError: any) {
          if (promoError.message?.includes("already exists")) {
            console.log(`\n⚠️  Promotion code "TEST100" already exists but couldn't retrieve it.`)
            console.log(`   Try using "TEST100" in checkout - it should work!`)
          } else {
            throw promoError
          }
        }
      }
    } else {
      console.log(`\n📝 Creating new coupon "${testCouponId}"...`)
      
      // Create a 100% off coupon
      const coupon = await stripe.coupons.create({
        id: testCouponId,
        percent_off: 100,
        duration: "once", // One-time use per customer
        name: "Test 100% Off - Paid Blueprint",
        metadata: {
          purpose: "testing",
          product: "paid_blueprint",
        },
      })

      console.log(`\n✅ Created coupon:`)
      console.log(`   ID: ${coupon.id}`)
      console.log(`   Percent off: ${coupon.percent_off}%`)
      console.log(`   Valid: ${coupon.valid}`)
      console.log(`   Duration: ${coupon.duration}`)

      // Create a promotion code for easy use
      console.log(`\n📝 Creating promotion code...`)
      try {
        const promotionCode = await stripe.promotionCodes.create({
          coupon: testCouponId,
          code: "TEST100",
          active: true,
        })

        console.log(`\n✅ Created promotion code:`)
        console.log(`   Code: "${promotionCode.code}"`)
        console.log(`   Active: ${promotionCode.active}`)
        console.log(`\n💡 Use this code in checkout: "${promotionCode.code}"`)
      } catch (promoError: any) {
        if (promoError.code === "resource_already_exists" || promoError.message?.includes("already exists")) {
          console.log(`\n⚠️  Promotion code "TEST100" already exists. Retrieving it...`)
          const existingPromos = await stripe.promotionCodes.list({
            code: "TEST100",
            limit: 1,
          })
          if (existingPromos.data.length > 0) {
            const promo = existingPromos.data[0]
            console.log(`\n✅ Found existing promotion code:`)
            console.log(`   Code: "${promo.code}"`)
            console.log(`   Active: ${promo.active}`)
            console.log(`\n💡 Use this code in checkout: "${promo.code}"`)
          }
        } else {
          throw promoError
        }
      }
    }

    // Verify the promotion code is accessible
    try {
      const allPromos = await stripe.promotionCodes.list({
        limit: 100,
      })
      const testPromos = allPromos.data.filter(p => 
        p.code.toUpperCase() === "TEST100" || 
        (typeof p.coupon === 'string' ? p.coupon === testCouponId : p.coupon?.id === testCouponId)
      )
      
      if (testPromos.length > 0) {
        console.log(`\n✅ Verified promotion code is accessible:`)
        testPromos.forEach(promo => {
          console.log(`   Code: "${promo.code}" (Active: ${promo.active})`)
        })
      }
    } catch (error) {
      console.log(`\n⚠️  Could not verify promotion codes, but coupon exists`)
    }

    console.log("\n" + "=".repeat(80))
    console.log("📋 SUMMARY")
    console.log("=".repeat(80))
    console.log("✅ Test coupon created/verified")
    console.log("✅ Promotion code: TEST100")
    console.log("\n💡 How to use:")
    console.log("   1. Go to checkout for paid_blueprint")
    console.log("   2. Enter code: TEST100")
    console.log("   3. Complete checkout (will be $0)")
    console.log("   4. Check webhook logs for processing")
    console.log("\n⚠️  Note: This is a TEST coupon in your Stripe account")
    console.log("   Make sure you're using the correct Stripe mode (test/live)")

  } catch (error: any) {
    console.error("\n❌ Error creating coupon:", error.message)
    if (error.code === "resource_already_exists") {
      console.log("\n💡 Coupon already exists. Checking for promotion codes...")
      // Try to list existing promotion codes
      try {
        const promos = await stripe.promotionCodes.list({ limit: 100 })
        const testPromos = promos.data.filter(p => 
          p.code.toUpperCase().includes("TEST") || 
          p.code.toUpperCase().includes("100")
        )
        if (testPromos.length > 0) {
          console.log("\n✅ Found existing promotion codes:")
          testPromos.forEach(promo => {
            console.log(`   - "${promo.code}" (coupon: ${promo.coupon})`)
          })
        }
      } catch (listError) {
        console.error("Error listing promotion codes:", listError)
      }
    }
    throw error
  }
}

createTestCoupon().catch(console.error)
