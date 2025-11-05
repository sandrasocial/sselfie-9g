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
      console.log("[v0] Create portal session: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Create portal session: Auth user ID:", authUser.id)

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] Create portal session: User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Create portal session: Neon user ID:", neonUser.id)

    // Get user's Stripe customer ID
    const subscriptionResult = await sql`
      SELECT stripe_customer_id 
      FROM subscriptions 
      WHERE user_id = ${neonUser.id} 
      AND stripe_customer_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (subscriptionResult.length === 0 || !subscriptionResult[0].stripe_customer_id) {
      console.log("[v0] Create portal session: No subscription found")
      return NextResponse.json({ error: "No subscription found" }, { status: 404 })
    }

    const stripeCustomerId = subscriptionResult[0].stripe_customer_id
    console.log("[v0] Create portal session: Stripe customer ID:", stripeCustomerId)

    const origin = request.headers.get("origin")
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin || "https://sselfie.ai"

    // Create Stripe customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/studio?tab=settings`,
    })

    console.log("[v0] Create portal session: Session created successfully")

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("[v0] Error creating portal session:", error)
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}
