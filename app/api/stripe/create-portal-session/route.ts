import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/neon"

export async function POST(request: Request) {
  try {
    console.log("[v0] Create portal session: Starting")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.error("[v0] Create portal session: Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Create portal session: Auth user ID:", authUser.id)

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.error("[v0] Create portal session: User not found for auth ID:", authUser.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Create portal session: Neon user ID:", neonUser.id)

    let stripeCustomerId: string | null = null

    // First, try to get from subscriptions table
    const subscriptionResult = await sql`
      SELECT stripe_customer_id 
      FROM subscriptions 
      WHERE user_id = ${neonUser.id} 
      AND stripe_customer_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log("[v0] Create portal session: Subscription query result:", subscriptionResult)

    if (subscriptionResult.length > 0 && subscriptionResult[0].stripe_customer_id) {
      stripeCustomerId = subscriptionResult[0].stripe_customer_id
      console.log("[v0] Create portal session: Found Stripe customer ID in subscriptions table:", stripeCustomerId)
    } else {
      // Fall back to users table
      console.log("[v0] Create portal session: No subscription found, checking users table")
      const userResult = await sql`
        SELECT stripe_customer_id 
        FROM users 
        WHERE id = ${neonUser.id} 
        AND stripe_customer_id IS NOT NULL
        LIMIT 1
      `

      console.log("[v0] Create portal session: User query result:", userResult)

      if (userResult.length > 0 && userResult[0].stripe_customer_id) {
        stripeCustomerId = userResult[0].stripe_customer_id
        console.log("[v0] Create portal session: Found Stripe customer ID in users table:", stripeCustomerId)
      }
    }

    if (!stripeCustomerId) {
      console.error("[v0] Create portal session: No Stripe customer ID found for user:", neonUser.id)
      return NextResponse.json(
        {
          error: "no_stripe_customer",
          message:
            "Your subscription is not managed through Stripe. Please contact support@sselfie.studio for subscription management.",
        },
        { status: 400 },
      )
    }

    const origin = request.headers.get("origin")
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin || "https://sselfie.ai"

    console.log("[v0] Create portal session: Creating portal session for customer:", stripeCustomerId)
    console.log("[v0] Create portal session: Return URL will be:", `${baseUrl}/studio#settings`)

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/studio#settings`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || "bpc_1SRX2wEVJvME7vkwu0rlIgfW",
    })

    console.log("[v0] Create portal session: Portal URL created:", portalSession.url)

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("[v0] Error creating portal session:", error)
    return NextResponse.json(
      {
        error: "Failed to create portal session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
