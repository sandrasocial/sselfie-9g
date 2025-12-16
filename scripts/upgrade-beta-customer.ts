/**
 * Script to upgrade a beta customer to Brand Studio with BETA50 coupon
 * 
 * Usage:
 *   pnpm tsx scripts/upgrade-beta-customer.ts <customer-email>
 * 
 * This script will:
 * 1. Find the customer's active subscription
 * 2. Update it to Brand Studio pricing
 * 3. Apply the BETA50 coupon (50% off forever)
 * 4. Update the database to reflect the change
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const sql = neon(process.env.DATABASE_URL!)

async function upgradeBetaCustomer(customerEmail: string) {
  try {
    console.log(`[v0] Looking up customer: ${customerEmail}`)

    // Find user in database (case-insensitive search)
    const users = await sql`
      SELECT id, email FROM users WHERE LOWER(email) = LOWER(${customerEmail}) LIMIT 1
    `

    if (users.length === 0) {
      throw new Error(`User not found: ${customerEmail}`)
    }

    const userId = users[0].id
    console.log(`[v0] Found user: ${userId}`)

    // Find subscription in database
    const subscriptions = await sql`
      SELECT id, stripe_subscription_id, product_type, status
      FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (subscriptions.length === 0) {
      throw new Error(`No active subscription found for ${customerEmail}`)
    }

    const subscription = subscriptions[0]
    console.log(`[v0] Found subscription: ${subscription.stripe_subscription_id}`)
    console.log(`[v0] Current product type: ${subscription.product_type}`)

    if (subscription.product_type === "brand_studio_membership") {
      console.log(`[v0] Customer is already on Brand Studio`)
      return
    }

    // Retrieve subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
    console.log(`[v0] Current Stripe subscription status: ${stripeSubscription.status}`)

    // Get Brand Studio price ID - try env var first, then look it up from Stripe
    let brandStudioPriceId = process.env.STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID
    
    if (!brandStudioPriceId) {
      console.log(`[v0] Price ID not in env, looking up from Stripe products...`)
      // Look up the price ID from Stripe
      const products = await stripe.products.list({ limit: 100, active: true })
      const brandStudioProduct = products.data.find(p => 
        p.name.toLowerCase().includes("brand studio") || 
        p.metadata?.product_type === "brand_studio_membership"
      )
      
      if (brandStudioProduct) {
        const prices = await stripe.prices.list({ product: brandStudioProduct.id, active: true })
        const monthlyPrice = prices.data.find(p => p.recurring?.interval === "month")
        if (monthlyPrice) {
          brandStudioPriceId = monthlyPrice.id
          console.log(`[v0] Found Brand Studio price ID: ${brandStudioPriceId}`)
        }
      }
      
      if (!brandStudioPriceId) {
        throw new Error("Could not find Brand Studio price ID. Please set STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID or ensure the product exists in Stripe.")
      }
    }

    // Get BETA50 coupon - try to retrieve, create if it doesn't exist
    let betaCoupon
    try {
      betaCoupon = await stripe.coupons.retrieve("BETA50")
      console.log(`[v0] Found BETA50 coupon: ${betaCoupon.percent_off}% off`)
    } catch (error: any) {
      if (error.code === "resource_missing") {
        console.log(`[v0] BETA50 coupon not found, creating it...`)
        try {
          betaCoupon = await stripe.coupons.create({
            id: "BETA50",
            percent_off: 50,
            duration: "forever",
            name: "Beta Launch - 50% Off Forever",
            metadata: {
              campaign: "beta_launch",
              description: "50% off for first 100 beta users - locked in forever",
            },
          })
          console.log(`[v0] ✅ Created BETA50 coupon: ${betaCoupon.percent_off}% off`)
        } catch (createError: any) {
          throw new Error(`Failed to create BETA50 coupon: ${createError.message}`)
        }
      } else {
        throw new Error(`BETA50 coupon error: ${error.message}`)
      }
    }

    // Update subscription: change price and apply coupon
    const firstItem = stripeSubscription.items.data[0]
    if (!firstItem) {
      throw new Error("No subscription items found")
    }

    console.log(`[v0] Updating subscription to Brand Studio with BETA50 coupon...`)

    const updatedSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [
        {
          id: firstItem.id,
          price: brandStudioPriceId,
        },
      ],
      coupon: "BETA50", // Apply the beta coupon
      proration_behavior: "create_prorations", // Prorate the difference
      metadata: {
        ...stripeSubscription.metadata,
        upgraded_from: subscription.product_type,
        upgraded_to: "brand_studio_membership",
        user_id: userId,
        beta_upgrade: "true",
      },
    })

    console.log(`[v0] ✅ Subscription updated successfully!`)
    console.log(`[v0] New price: $${(updatedSubscription.items.data[0].price.unit_amount! / 100).toFixed(2)}/month`)
    console.log(`[v0] Discount: ${betaCoupon.percent_off}% off`)
    console.log(`[v0] Final price: $${((updatedSubscription.items.data[0].price.unit_amount! / 100) * (1 - betaCoupon.percent_off! / 100)).toFixed(2)}/month`)

    // Update database
    await sql`
      UPDATE subscriptions
      SET 
        product_type = 'brand_studio_membership',
        plan = 'brand_studio_membership',
        updated_at = NOW()
      WHERE id = ${subscription.id}
    `

    console.log(`[v0] ✅ Database updated`)

    // Grant credits for the new tier (upgrade bonus - webhook will handle future monthly grants)
    // Check if we should grant credits now or wait for next billing cycle
    const { grantMonthlyCredits } = await import("@/lib/credits")
    
    // Only grant credits if this is a mid-cycle upgrade (not at billing renewal)
    // The webhook will handle regular monthly grants going forward
    console.log(`[v0] Note: Credits will be granted automatically on next billing cycle via webhook`)
    console.log(`[v0] If you want to grant credits immediately, you can do so manually via admin panel`)
    
    // Optional: Uncomment to grant credits immediately
    // const creditResult = await grantMonthlyCredits(userId, "brand_studio_membership", false)
    // if (creditResult.success) {
    //   console.log(`[v0] ✅ Credits granted: ${creditResult.newBalance} total`)
    // } else {
    //   console.warn(`[v0] ⚠️ Credit grant failed: ${creditResult.error}`)
    // }

    console.log(`\n✅ Upgrade complete!`)
    console.log(`Customer: ${customerEmail}`)
    console.log(`New plan: Brand Studio`)
    console.log(`Price: $74.50/month (50% off with BETA50 coupon)`)
  } catch (error: any) {
    console.error(`[v0] ❌ Error upgrading customer:`, error.message)
    throw error
  }
}

// Run script
const customerEmail = process.argv[2]

if (!customerEmail) {
  console.error("Usage: pnpm tsx scripts/upgrade-beta-customer.ts <customer-email>")
  process.exit(1)
}

upgradeBetaCustomer(customerEmail)
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })

