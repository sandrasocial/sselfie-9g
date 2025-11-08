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

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in Neon" }, { status: 404 })
    }

    console.log(`[v0] [Diagnostic] Checking subscription linking for user: ${neonUser.id}`)

    // Check user record
    const userRecord = await sql`
      SELECT 
        id,
        email,
        display_name,
        plan,
        stripe_customer_id,
        stripe_subscription_id,
        created_at
      FROM users
      WHERE id = ${neonUser.id}
    `

    // Check all subscriptions - handle missing stripe_customer_id column gracefully
    let allSubscriptions = []
    try {
      allSubscriptions = await sql`
        SELECT 
          id,
          user_id,
          product_type,
          status,
          stripe_customer_id,
          stripe_subscription_id,
          current_period_start,
          current_period_end,
          created_at
        FROM subscriptions
        WHERE user_id = ${neonUser.id}
        ORDER BY created_at DESC
      `
    } catch (subError: any) {
      // If stripe_customer_id column doesn't exist yet, query without it
      if (subError.message?.includes('column "stripe_customer_id" does not exist')) {
        console.log("[v0] stripe_customer_id column doesn't exist yet, querying without it")
        allSubscriptions = await sql`
          SELECT 
            id,
            user_id,
            product_type,
            status,
            stripe_subscription_id,
            current_period_start,
            current_period_end,
            created_at
          FROM subscriptions
          WHERE user_id = ${neonUser.id}
          ORDER BY created_at DESC
        `
      } else {
        throw subError
      }
    }

    // Check user credits - use 'balance' not 'credits'
    const credits = await sql`
      SELECT 
        user_id,
        balance,
        total_purchased,
        total_used,
        updated_at
      FROM user_credits
      WHERE user_id = ${neonUser.id}
    `

    return NextResponse.json({
      success: true,
      userId: neonUser.id,
      user: userRecord[0] || null,
      subscriptions: allSubscriptions,
      credits: credits[0] || null,
      diagnosis: {
        hasUserRecord: userRecord.length > 0,
        hasSubscriptions: allSubscriptions.length > 0,
        hasActiveSubscription: allSubscriptions.some((s) => s.status === "active"),
        hasStudioMembership: allSubscriptions.some((s) => s.product_type === "sselfie_studio" && s.status === "active"),
        userHasStripeCustomerId: !!userRecord[0]?.stripe_customer_id,
        userHasStripeSubscriptionId: !!userRecord[0]?.stripe_subscription_id,
        subscriptionsWithStripeIds: allSubscriptions.filter((s) => s.stripe_customer_id && s.stripe_subscription_id)
          .length,
        subscriptionsMissingStripeIds: allSubscriptions.filter(
          (s) => !s.stripe_customer_id || !s.stripe_subscription_id,
        ).length,
        creditBalance: credits[0]?.balance || 0,
      },
    })
  } catch (error) {
    console.error("[v0] Error in subscription diagnostic:", error)
    return NextResponse.json({ error: "Diagnostic failed", details: String(error) }, { status: 500 })
  }
}
