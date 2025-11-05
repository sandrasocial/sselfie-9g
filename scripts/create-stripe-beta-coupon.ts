/**
 * Script to create a 50% off beta discount coupon in Stripe
 * Run this once to set up the beta discount
 */

import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

async function createBetaCoupon() {
  try {
    console.log("[v0] Creating beta discount coupon...")

    // Create a 50% off coupon
    const coupon = await stripe.coupons.create({
      percent_off: 50,
      duration: "forever", // Discount applies forever for beta users
      name: "Beta Launch - 50% Off Forever",
      id: "BETA50", // Custom coupon ID
      metadata: {
        campaign: "beta_launch",
        description: "50% off for first 100 beta users - locked in forever",
      },
    })

    console.log("[v0] Beta coupon created successfully!")
    console.log("[v0] Coupon ID:", coupon.id)
    console.log("[v0] Discount:", `${coupon.percent_off}% off`)
    console.log("[v0] Duration:", coupon.duration)

    // Create a promotion code for easy customer use
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: "BETA50",
      max_redemptions: 100, // Limit to first 100 users
      metadata: {
        campaign: "beta_launch",
      },
    })

    console.log("[v0] Promotion code created successfully!")
    console.log("[v0] Code:", promotionCode.code)
    console.log("[v0] Max redemptions:", promotionCode.max_redemptions)

    console.log("\n✅ Beta discount setup complete!")
    console.log("Customers can use code 'BETA50' at checkout for 50% off")
  } catch (error: any) {
    if (error.code === "resource_already_exists") {
      console.log("[v0] Beta coupon already exists - skipping creation")
    } else {
      console.error("[v0] Error creating beta coupon:", error)
      throw error
    }
  }
}

createBetaCoupon()
