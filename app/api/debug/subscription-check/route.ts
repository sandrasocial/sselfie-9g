import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [DEBUG] Auth User:", {
      id: authUser.id,
      email: authUser.email,
    })

    const neonUser = await getUserByAuthId(authUser.id)
    console.log("[v0] [DEBUG] Neon User:", neonUser)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found in Neon" }, { status: 404 })
    }

    // Check all subscriptions for this user
    const allSubscriptions = await sql`
      SELECT 
        id,
        user_id,
        product_type,
        status,
        stripe_subscription_id,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
      FROM subscriptions 
      WHERE user_id = ${neonUser.id}
      ORDER BY created_at DESC
    `

    console.log("[v0] [DEBUG] All subscriptions:", allSubscriptions)

    const creditBalance = await sql`
      SELECT balance
      FROM credit_transactions
      WHERE user_id = ${neonUser.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log("[v0] [DEBUG] Credit balance:", creditBalance)

    // Check Stripe customer
    const stripeInfo = await sql`
      SELECT stripe_customer_id, stripe_subscription_id, plan
      FROM users
      WHERE id = ${neonUser.id}
    `

    console.log("[v0] [DEBUG] Stripe info:", stripeInfo)

    return NextResponse.json({
      authUser: {
        id: authUser.id,
        email: authUser.email,
      },
      neonUser: {
        id: neonUser.id,
        email: neonUser.email,
        plan: neonUser.plan,
      },
      subscriptions: allSubscriptions,
      creditBalance: creditBalance[0]?.balance || 0,
      stripeInfo: stripeInfo[0],
      diagnosis: {
        hasSubscriptionRecord: allSubscriptions.length > 0,
        userPlanSet: !!neonUser.plan,
        issue:
          allSubscriptions.length === 0 && neonUser.plan === "sselfie-studio"
            ? "User purchased membership but subscription record was not created in database"
            : null,
      },
    })
  } catch (error) {
    console.error("[v0] [DEBUG] Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
