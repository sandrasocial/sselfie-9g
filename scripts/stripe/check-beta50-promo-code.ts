/**
 * Check BETA50 promotion code settings to verify beta program closure
 */

import Stripe from "stripe"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

async function checkBeta50PromoCode() {
  console.log("=" .repeat(80))
  console.log("CHECKING BETA50 PROMOTION CODE SETTINGS")
  console.log("=" .repeat(80))
  console.log()
  
  try {
    // Check if BETA50 coupon exists
    const coupon = await stripe.coupons.retrieve("BETA50")
    console.log("✅ BETA50 Coupon found:")
    console.log(`   ID: ${coupon.id}`)
    console.log(`   Percent off: ${coupon.percent_off}%`)
    console.log(`   Duration: ${coupon.duration}`)
    console.log(`   Valid: ${coupon.valid}`)
    console.log(`   Times redeemed: ${coupon.times_redeemed}`)
    console.log(`   Max redemptions: ${coupon.max_redemptions || 'unlimited'}`)
    console.log()
    
    // Check for promotion codes linked to BETA50
    console.log("Checking for BETA50 promotion codes...")
    const promoCodes = await stripe.promotionCodes.list({
      code: "BETA50",
      limit: 10,
    })
    
    if (promoCodes.data.length === 0) {
      console.log("⚠️  No promotion code found with code 'BETA50'")
      console.log("   This means users CANNOT enter BETA50 at checkout")
      console.log("   Beta discount can only be applied manually by admin")
      console.log()
    } else {
      for (const promo of promoCodes.data) {
        console.log(`✅ Promotion Code found:`)
        console.log(`   ID: ${promo.id}`)
        console.log(`   Code: ${promo.code}`)
        console.log(`   Active: ${promo.active}`)
        console.log(`   Times redeemed: ${promo.times_redeemed}`)
        console.log(`   Max redemptions: ${promo.max_redemptions || 'unlimited'}`)
        console.log(`   Coupon: ${typeof promo.coupon === 'string' ? promo.coupon : promo.coupon.id}`)
        console.log()
        
        // Security analysis
        if (promo.active && !promo.max_redemptions) {
          console.log("🔴 SECURITY RISK:")
          console.log("   Promotion code is ACTIVE with UNLIMITED redemptions")
          console.log("   Anyone can use BETA50 at checkout!")
          console.log()
          console.log("   Recommended fix:")
          console.log(`   stripe promotion_codes update ${promo.id} --active=false`)
          console.log(`   OR`)
          console.log(`   stripe promotion_codes update ${promo.id} --max-redemptions=100`)
          console.log()
        } else if (promo.active && promo.max_redemptions) {
          if (promo.times_redeemed >= promo.max_redemptions) {
            console.log("✅ SECURE:")
            console.log("   Max redemptions reached - no new users can use this code")
          } else {
            console.log("⚠️  ATTENTION:")
            console.log(`   ${promo.max_redemptions - promo.times_redeemed} redemptions remaining`)
            console.log("   New users can still use BETA50 at checkout")
          }
          console.log()
        } else if (!promo.active) {
          console.log("✅ SECURE:")
          console.log("   Promotion code is INACTIVE - users cannot use BETA50 at checkout")
          console.log()
        }
      }
    }
    
    // Also check for any other promotion codes using BETA50 coupon
    console.log("Checking all promotion codes using BETA50 coupon...")
    const allPromosForCoupon = await stripe.promotionCodes.list({
      coupon: "BETA50",
      limit: 100,
    })
    
    if (allPromosForCoupon.data.length > 0) {
      console.log(`Found ${allPromosForCoupon.data.length} promotion code(s) using BETA50:`)
      for (const promo of allPromosForCoupon.data) {
        const status = promo.active ? '🟢 ACTIVE' : '🔴 INACTIVE'
        const remaining = promo.max_redemptions 
          ? `${promo.times_redeemed}/${promo.max_redemptions} used`
          : `${promo.times_redeemed} used (unlimited)`
        console.log(`   ${status} ${promo.code} - ${remaining}`)
      }
      console.log()
    }
    
  } catch (error: any) {
    if (error.code === "resource_missing") {
      console.log("❌ BETA50 coupon not found in Stripe")
    } else {
      console.error("Error:", error.message)
    }
  }
  
  console.log("=" .repeat(80))
  console.log("SUMMARY")
  console.log("=" .repeat(80))
  console.log()
  console.log("Beta program closure checklist:")
  console.log("1. BETA50 coupon exists → Used for existing subscribers")
  console.log("2. Promotion code settings → Controls if new users can use it")
  console.log("3. Application code → Already verified (no auto-apply)")
  console.log()
  console.log("Next steps:")
  console.log("- If promotion code is active with unlimited redemptions → Deactivate it")
  console.log("- If promotion code doesn't exist → No action needed (most secure)")
  console.log("- Existing users with BETA50 coupon → Keep their discount")
}

checkBeta50PromoCode().catch(console.error)
