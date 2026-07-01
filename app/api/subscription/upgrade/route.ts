import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db/client"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"

type SupportedTier = "sselfie_studio_membership"

interface UpgradeRequestBody {
  targetTier?: SupportedTier
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as UpgradeRequestBody
    const targetTier: SupportedTier = body.targetTier ?? "sselfie_studio_membership"

    if (targetTier !== "sselfie_studio_membership") {
      return NextResponse.json({ error: "Unsupported upgrade target" }, { status: 400 })
    }

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = getDb()
    const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
    const activeSub =
      (await sql`
        SELECT id, product_type, stripe_subscription_id 
        FROM subscriptions 
        WHERE user_id = ${neonUser.id} AND status = 'active'
          AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
        ORDER BY created_at DESC
        LIMIT 1
      `) ?? []

    const subscription = activeSub[0]

    if (!subscription || !subscription.stripe_subscription_id) {
      // No subscription on record - fall back to creating a new embedded checkout
      try {
        const clientSecret = await createLandingCheckoutSession(targetTier)
        return NextResponse.json({ requiresCheckout: true, clientSecret })
      } catch (checkoutError: any) {
        console.error("[UPGRADE_API] Error creating checkout session:", checkoutError)
        return NextResponse.json(
          { 
            error: checkoutError?.message || "Failed to create checkout session. Please ensure STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID is configured." 
          },
          { status: 500 }
        )
      }
    }

    if (subscription.product_type === targetTier) {
      return NextResponse.json({ success: true, message: "Already on target tier" })
    }

    // For existing subscriptions, try to upgrade via subscription update first
    // But use the same price lookup as landing checkout for consistency
    const targetPriceId = process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID
    
    if (!targetPriceId) {
      // If env var not set, fall back to checkout session (same as landing page)
      console.log("[UPGRADE_API] Price ID not in env, using checkout session approach")
      try {
        const clientSecret = await createLandingCheckoutSession(targetTier)
        return NextResponse.json({ requiresCheckout: true, clientSecret })
      } catch (checkoutError: any) {
        console.error("[UPGRADE_API] Error creating checkout session:", checkoutError)
        return NextResponse.json(
          { 
            error: checkoutError?.message || "Failed to create checkout session" 
          },
          { status: 500 }
        )
      }
    }

    try {
      // Retrieve subscription to get line items
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
      const firstItem = stripeSub.items.data[0]

      if (!firstItem) {
        // Fall back to checkout if subscription structure is unexpected
        console.log("[UPGRADE_API] No subscription items found, using checkout session")
        const clientSecret = await createLandingCheckoutSession(targetTier)
        return NextResponse.json({ requiresCheckout: true, clientSecret })
      }

      // FIX B4: Change proration behavior to apply at next renewal (more predictable)
      // This prevents surprise mid-cycle charges
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          {
            id: firstItem.id,
            price: targetPriceId,
          },
        ],
        proration_behavior: "none", // Apply new price at next renewal (no immediate charge)
        metadata: {
          ...stripeSub.metadata,
          upgraded_from: subscription.product_type ?? "unknown",
          upgraded_to: targetTier,
          upgrade_date: new Date().toISOString(),
          user_id: neonUser.id,
        },
      })
      
      const stripeSubAny = stripeSub as any
      console.log(
        `[UPGRADE_API] ✅ Subscription upgraded. New price will apply at next renewal (${stripeSubAny.current_period_end ? new Date(stripeSubAny.current_period_end * 1000).toISOString().split('T')[0] : "unknown"})`
      )

      // Reflect change in local database
      await sql`
        UPDATE subscriptions
        SET product_type = ${targetTier}, updated_at = NOW()
        WHERE id = ${subscription.id}
      `

      return NextResponse.json({ success: true, targetTier })
    } catch (updateError: any) {
      // If subscription update fails, fall back to checkout session
      console.warn("[UPGRADE_API] Subscription update failed, falling back to checkout:", updateError)
      try {
        const clientSecret = await createLandingCheckoutSession(targetTier)
        return NextResponse.json({ requiresCheckout: true, clientSecret })
      } catch (checkoutError: any) {
        console.error("[UPGRADE_API] Error creating checkout session:", checkoutError)
        return NextResponse.json(
          { 
            error: checkoutError?.message || "Failed to upgrade subscription" 
          },
          { status: 500 }
        )
      }
    }
  } catch (error: any) {
    console.error("[v0] [UPGRADE_API] Error upgrading subscription:", error)
    return NextResponse.json({ error: error?.message ?? "Failed to upgrade" }, { status: 500 })
  }
}
