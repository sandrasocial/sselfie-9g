"use server"

import { stripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getProductById } from "@/lib/products"
import { neon } from "@neondatabase/serverless"

export async function createUpgradeCheckoutSession(
  tier: string,
  promoCode?: string | null
) {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    throw new Error("Please sign in first to upgrade your membership")
  }

  const user = await getUserByAuthId(authUser.id)
  if (!user) {
    throw new Error("User not found")
  }

  // Map tier to product ID
  const productIdMap: Record<string, string> = {
    creator: "sselfie_studio_membership",
    brand: "brand_studio_membership",
  }
  
  const productId = productIdMap[tier] || "sselfie_studio_membership"

  // Get product details to ensure correct name
  const product = getProductById(productId)
  if (!product) {
    throw new Error(`Product not found: ${productId}`)
  }

  // Get Stripe price ID for the subscription
  const priceIdMap: Record<string, string | undefined> = {
    sselfie_studio_membership: process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID,
    brand_studio_membership: process.env.STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID,
  }

  const stripePriceId = priceIdMap[productId]
  if (!stripePriceId) {
    throw new Error(`Stripe Price ID not configured for ${productId}`)
  }

  // Get or create Stripe customer
  const sql = neon(process.env.DATABASE_URL!)
  
  let customerId: string | undefined
  
  const existingSubscription = await sql`
    SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${user.id} LIMIT 1
  `

  if (existingSubscription[0]?.stripe_customer_id) {
    customerId = existingSubscription[0].stripe_customer_id
  } else {
    const existingUser = await sql`
      SELECT stripe_customer_id FROM users WHERE id = ${user.id} AND stripe_customer_id IS NOT NULL LIMIT 1
    `
    
    if (existingUser[0]?.stripe_customer_id) {
      customerId = existingUser[0].stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
    }
  }

  // Validate and apply promo code if provided
  // Stripe has two types: Promotion Codes (customer-facing like "FIRSTMONTH40") and Coupons (discount definitions)
  let validatedPromoCode: string | null = null
  let validatedCoupon: string | null = null
  
  if (promoCode) {
    const codeUpper = promoCode.toUpperCase()
    console.log(`[v0] Validating promo code: ${codeUpper}`)
    
    try {
      // First, try to find it as a promotion code (customer-facing code)
      const promotionCodes = await stripe.promotionCodes.list({
        code: codeUpper,
        active: true,
        limit: 1,
      })
      
      if (promotionCodes.data.length > 0) {
        const promoCodeObj = promotionCodes.data[0]
        // Check if promotion code is still valid
        if (promoCodeObj.active && (!promoCodeObj.max_redemptions || promoCodeObj.times_redeemed < promoCodeObj.max_redemptions)) {
          validatedPromoCode = promoCodeObj.id
          console.log(`[v0] ✅ Valid promotion code found: ${codeUpper} -> ${promoCodeObj.id}`)
        } else {
          console.log(`[v0] ⚠️ Promotion code ${codeUpper} found but not valid (inactive or max redemptions reached)`)
        }
      }
    } catch (error: any) {
      console.log(`[v0] Promotion code lookup failed for ${codeUpper}: ${error.message}`)
    }
    
    // If not found as promotion code, try as coupon ID
    if (!validatedPromoCode) {
      try {
        const coupon = await stripe.coupons.retrieve(codeUpper)
        console.log(`[v0] Coupon retrieved: ${coupon.id}, valid: ${coupon.valid}, percent_off: ${coupon.percent_off}, duration: ${coupon.duration}`)
        
        if (coupon.valid) {
          // Check additional restrictions
          const now = Math.floor(Date.now() / 1000)
          const isExpired = coupon.redeem_by && coupon.redeem_by < now
          const maxReached = coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions
          
          if (isExpired) {
            console.log(`[v0] ⚠️ Coupon ${codeUpper} has expired (redeem_by: ${coupon.redeem_by})`)
          } else if (maxReached) {
            console.log(`[v0] ⚠️ Coupon ${codeUpper} has reached max redemptions (${coupon.times_redeemed}/${coupon.max_redemptions})`)
          } else {
            validatedCoupon = coupon.id
            console.log(`[v0] ✅ Valid coupon found: ${codeUpper} (${coupon.percent_off}% off, ${coupon.duration})`)
          }
        } else {
          console.log(`[v0] ⚠️ Coupon ${codeUpper} is not valid`)
        }
      } catch (error: any) {
        console.log(`[v0] Code ${codeUpper} not found as coupon: ${error.message}`)
      }
    }
    
    if (!validatedPromoCode && !validatedCoupon) {
      console.log(`[v0] ℹ️ Code ${codeUpper} not validated - user can enter manually in checkout form`)
    }
  }

  // Create checkout session
  // Use the actual Stripe Price ID (like landing-checkout.ts does) - this ensures coupons work correctly
  // The product name comes from Stripe's product configuration
  const sessionConfig: any = {
    ui_mode: "embedded",
    mode: "subscription",
    redirect_on_completion: "never",
    customer: customerId,
    line_items: [
      {
        price: stripePriceId, // Use the actual Price ID, not price_data
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        product_id: productId,
        product_type: product.type,
        source: "email_automation",
        campaign: "onetime-to-creator",
        original_promo: promoCode || "",
      },
    },
    metadata: {
      user_id: user.id,
      product_id: productId,
      product_type: product.type,
      source: "email_automation",
      campaign: "onetime-to-creator",
    },
  }
  
  // Apply discount if we found a valid promotion code or coupon
  // IMPORTANT: Cannot use both discounts and allow_promotion_codes simultaneously
  if (validatedPromoCode) {
    sessionConfig.discounts = [{ promotion_code: validatedPromoCode }]
    console.log(`[v0] Applying promotion code: ${validatedPromoCode}`)
  } else if (validatedCoupon) {
    sessionConfig.discounts = [{ coupon: validatedCoupon }]
    console.log(`[v0] Applying coupon: ${validatedCoupon}`)
  } else {
    // Only allow promotion codes if no discount is pre-applied
    sessionConfig.allow_promotion_codes = true
  }
  
  const session = await stripe.checkout.sessions.create(sessionConfig)

  return session.client_secret
}

