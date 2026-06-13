import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"

// Coupon used for cancel-intercept retention offer: 50% off one month
const RETENTION_COUPON_ID = "COMEBACK50"

export async function POST() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" as any })
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get their active Studio subscription from DB
    const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
    const rows = await sql`
      SELECT stripe_subscription_id
      FROM subscriptions
      WHERE user_id = ${neonUser.id}
        AND status = 'active'
        AND product_type = 'sselfie_studio_membership'
        AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
      LIMIT 1
    `

    if (!rows[0]?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active Studio subscription found" }, { status: 400 })
    }

    const subscriptionId = rows[0].stripe_subscription_id

    // Verify coupon exists in Stripe
    try {
      await stripe.coupons.retrieve(RETENTION_COUPON_ID)
    } catch {
      return NextResponse.json({ error: "Retention coupon not available" }, { status: 500 })
    }

    // Apply coupon to subscription (applies on next invoice)
    await stripe.subscriptions.update(subscriptionId, {
      discounts: [{ coupon: RETENTION_COUPON_ID }],
    } as any)

    console.log(`[retention] Applied ${RETENTION_COUPON_ID} to subscription ${subscriptionId} for ${neonUser.email}`)

    return NextResponse.json({ success: true, coupon: RETENTION_COUPON_ID })
  } catch (error) {
    console.error("[retention] Error applying retention discount:", error)
    return NextResponse.json({ error: "Failed to apply discount" }, { status: 500 })
  }
}
