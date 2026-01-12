/**
 * Test Blueprint Discount Code
 * 
 * This script tests the discount code validation for paid blueprint checkout
 * by directly querying Stripe API
 */

import Stripe from "stripe"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

async function testDiscountCode() {
  console.log("\n🧪 TESTING BLUEPRINT DISCOUNT CODE\n")
  console.log("=" .repeat(80))
  
  const promoCode = "test100"
  const codeUpper = promoCode.toUpperCase()
  
  console.log(`📋 Test Parameters:`)
  console.log(`   - Promo Code: ${promoCode} (${codeUpper})`)
  console.log(`   - Product: paid_blueprint`)
  console.log("")
  
  try {
    // Test 1: Check as promotion code
    console.log("🔍 TEST 1: Promotion Code Search")
    console.log("-".repeat(80))
    
    try {
      const promotionCodes = await stripe.promotionCodes.list({
        code: codeUpper,
        active: true,
        limit: 1,
      })
      
      console.log(`   Code: ${codeUpper}`)
      console.log(`   Found: ${promotionCodes.data.length > 0 ? "✅ YES" : "❌ NO"}`)
      
      if (promotionCodes.data.length > 0) {
        const promo = promotionCodes.data[0]
        console.log(`\n   📊 Promotion Code Details:`)
        console.log(`      - ID: ${promo.id}`)
        console.log(`      - Active: ${promo.active ? "✅" : "❌"}`)
        console.log(`      - Times Redeemed: ${promo.times_redeemed}`)
        console.log(`      - Max Redemptions: ${promo.max_redemptions || "Unlimited"}`)
        console.log(`      - Coupon ID: ${promo.coupon.id}`)
        
        // Get full coupon details
        const coupon = await stripe.coupons.retrieve(promo.coupon.id)
        console.log(`\n   💰 Coupon Details:`)
        console.log(`      - Valid: ${coupon.valid ? "✅" : "❌"}`)
        console.log(`      - Discount: ${coupon.percent_off ? `${coupon.percent_off}% off` : coupon.amount_off ? `$${coupon.amount_off / 100} off` : "N/A"}`)
        console.log(`      - Times Redeemed: ${coupon.times_redeemed}`)
        console.log(`      - Max Redemptions: ${coupon.max_redemptions || "Unlimited"}`)
        
        // Check expiration
        if (coupon.redeem_by) {
          const now = Math.floor(Date.now() / 1000)
          const isExpired = coupon.redeem_by < now
          console.log(`      - Expires: ${new Date(coupon.redeem_by * 1000).toISOString()}`)
          console.log(`      - Expired: ${isExpired ? "❌ YES" : "✅ NO"}`)
        } else {
          console.log(`      - Expires: Never`)
        }
        
        // Check product restrictions
        console.log(`\n   🎯 Product Restrictions:`)
        if (coupon.applies_to?.products && coupon.applies_to.products.length > 0) {
          console.log(`      - Restricted to products: ${coupon.applies_to.products.join(", ")}`)
          console.log(`      ⚠️  WARNING: This coupon only applies to specific products!`)
          console.log(`      ⚠️  Make sure your paid_blueprint Stripe product ID is in this list`)
        } else {
          console.log(`      - No product restrictions (applies to all products) ✅`)
        }
        
        // Check other restrictions
        if (promo.restrictions) {
          console.log(`\n   🚫 Other Restrictions:`)
          if (promo.restrictions.first_time_transaction) {
            console.log(`      - First Time Transaction Only: ✅`)
          }
          if (promo.restrictions.minimum_amount) {
            console.log(`      - Minimum Amount: $${promo.restrictions.minimum_amount / 100}`)
          }
          if (promo.restrictions.minimum_amount_currency) {
            console.log(`      - Currency: ${promo.restrictions.minimum_amount_currency}`)
          }
        }
        
        // Check if max redemptions reached
        const isMaxReached = promo.max_redemptions && promo.times_redeemed >= promo.max_redemptions
        console.log(`\n   ✅ Validation Result:`)
        if (!promo.active) {
          console.log(`      ❌ Promotion code is NOT active`)
        } else if (isMaxReached) {
          console.log(`      ❌ Max redemptions reached (${promo.times_redeemed}/${promo.max_redemptions})`)
        } else if (!coupon.valid) {
          console.log(`      ❌ Coupon is NOT valid`)
        } else {
          console.log(`      ✅ Promotion code is VALID and can be used`)
        }
        
      } else {
        console.log(`   ⚠️  Promotion code not found. Trying as coupon ID...`)
      }
    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message)
    }
    
    console.log("")
    
    // Test 2: Check as coupon ID
    console.log("🔍 TEST 2: Coupon ID Search")
    console.log("-".repeat(80))
    
    try {
      const coupon = await stripe.coupons.retrieve(codeUpper)
      console.log(`   ID: ${codeUpper}`)
      console.log(`   Found: ✅ YES`)
      console.log(`\n   📊 Coupon Details:`)
      console.log(`      - Valid: ${coupon.valid ? "✅" : "❌"}`)
      console.log(`      - Discount: ${coupon.percent_off ? `${coupon.percent_off}% off` : coupon.amount_off ? `$${coupon.amount_off / 100} off` : "N/A"}`)
      console.log(`      - Times Redeemed: ${coupon.times_redeemed}`)
      console.log(`      - Max Redemptions: ${coupon.max_redemptions || "Unlimited"}`)
      
      if (coupon.redeem_by) {
        const now = Math.floor(Date.now() / 1000)
        const isExpired = coupon.redeem_by < now
        console.log(`      - Expires: ${new Date(coupon.redeem_by * 1000).toISOString()}`)
        console.log(`      - Expired: ${isExpired ? "❌ YES" : "✅ NO"}`)
      }
      
      if (coupon.applies_to?.products && coupon.applies_to.products.length > 0) {
        console.log(`      - Restricted to products: ${coupon.applies_to.products.join(", ")}`)
        console.log(`      ⚠️  WARNING: This coupon only applies to specific products!`)
      } else {
        console.log(`      - No product restrictions (applies to all products) ✅`)
      }
      
      const isMaxReached = coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions
      const now = Math.floor(Date.now() / 1000)
      const isExpired = coupon.redeem_by && coupon.redeem_by < now
      
      console.log(`\n   ✅ Validation Result:`)
      if (!coupon.valid) {
        console.log(`      ❌ Coupon is NOT valid`)
      } else if (isExpired) {
        console.log(`      ❌ Coupon has EXPIRED`)
      } else if (isMaxReached) {
        console.log(`      ❌ Max redemptions reached (${coupon.times_redeemed}/${coupon.max_redemptions})`)
      } else {
        console.log(`      ✅ Coupon is VALID and can be used`)
      }
      
    } catch (error: any) {
      console.log(`   ID: ${codeUpper}`)
      console.log(`   Found: ❌ NO`)
      console.log(`   Error: ${error.message}`)
    }
    
    console.log("")
    console.log("=" .repeat(80))
    console.log("✅ TEST COMPLETE")
    console.log("")
    console.log("💡 Summary:")
    console.log("   - If the code is found but has product restrictions, check your Stripe product IDs")
    console.log("   - If the code is expired or max redemptions reached, it won't work")
    console.log("   - If the code is valid, the issue might be in how it's applied in checkout")
    console.log("")
    
  } catch (error: any) {
    console.error("\n❌ TEST FAILED:", error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run test
testDiscountCode()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
