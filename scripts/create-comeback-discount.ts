/**
 * Script to create a 50% off comeback discount coupon in Stripe
 * For re-engagement sequence - 50% off first month only
 */

import Stripe from "stripe"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY environment variable is not set")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
})

async function createComebackDiscount() {
  try {
    console.log("[v0] Creating comeback discount coupon...")

    // Create a 50% off coupon for first month only (once)
    const coupon = await stripe.coupons.create({
      percent_off: 50,
      duration: "once", // Only applies to first payment
      name: "Comeback Offer - 50% Off First Month",
      id: "COMEBACK50", // Custom coupon ID
      metadata: {
        campaign: "reengagement_sequence",
        description: "50% off first month for returning users",
      },
    })

    console.log("[v0] Comeback coupon created successfully!")
    console.log("[v0] Coupon ID:", coupon.id)
    console.log("[v0] Discount:", `${coupon.percent_off}% off`)
    console.log("[v0] Duration:", coupon.duration)

    // Create a promotion code for easy customer use
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: "COMEBACK50",
      metadata: {
        campaign: "reengagement_sequence",
      },
    })

    console.log("[v0] Promotion code created successfully!")
    console.log("[v0] Code:", promotionCode.code)
    console.log("[v0] Active:", promotionCode.active)

    console.log("\n✅ Comeback discount setup complete!")
    console.log("Customers can use code 'COMEBACK50' at checkout for 50% off first month")
    console.log("\nTo use in emails, add ?promo=COMEBACK50 to checkout links")
  } catch (error: any) {
    if (error.code === "resource_already_exists") {
      console.log("[v0] Comeback coupon already exists - skipping creation")
      console.log("[v0] Existing coupon ID: COMEBACK50")
    } else {
      console.error("[v0] Error creating comeback coupon:", error)
      throw error
    }
  }
}

createComebackDiscount()
  .then(() => {
    console.log("[v0] Script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[v0] Script failed:", error)
    process.exit(1)
  })

