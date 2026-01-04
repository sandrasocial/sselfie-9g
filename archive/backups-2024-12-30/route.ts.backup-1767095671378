import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/neon"

export async function GET() {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] [DEBUG] Checking subscription for user:", neonUser.id)

    // Check subscriptions table
    const subscriptions = await sql`
      SELECT 
        id,
        user_id,
        product_type,
        plan,
        status,
        stripe_subscription_id,
        stripe_customer_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
      FROM subscriptions 
      WHERE user_id = ${neonUser.id}
      ORDER BY created_at DESC
    `

    // Check credit transactions
    const creditTransactions = await sql`
      SELECT 
        id,
        user_id,
        amount,
        transaction_type,
        description,
        balance_after,
        created_at
      FROM credit_transactions
      WHERE user_id = ${neonUser.id}
      AND transaction_type = 'purchase'
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Check current credits
    const credits = await sql`
      SELECT balance
      FROM user_credits
      WHERE user_id = ${neonUser.id}
    `

    return NextResponse.json({
      userId: neonUser.id,
      email: neonUser.email,
      subscriptions: subscriptions,
      subscriptionCount: subscriptions.length,
      creditBalance: credits[0]?.balance || 0,
      recentPurchases: creditTransactions,
      diagnosis: {
        hasActiveSubscription: subscriptions.some(
          (s) => s.status === "active" && s.product_type === "sselfie_studio_membership",
        ),
        hasAnySubscription: subscriptions.length > 0,
        hasCredits: (credits[0]?.balance || 0) > 0,
        hasPurchaseHistory: creditTransactions.length > 0,
      },
    })
  } catch (error) {
    console.error("[v0] [DEBUG] Error:", error)
    return NextResponse.json({ error: "Failed to fetch debug info" }, { status: 500 })
  }
}
