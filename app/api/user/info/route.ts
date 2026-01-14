import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserSubscription } from "@/lib/subscription"
import { sql } from "@/lib/neon"

export async function GET() {
  try {
    console.log("[v0] User info API called")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User info: Auth user ID:", authUser.id)

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] User info: Neon user ID:", neonUser.id)

    const subscription = await getUserSubscription(neonUser.id)

    // Check for stripe_customer_id in both subscriptions and users table
    let stripeCustomerId: string | null = null
    
    // First check subscriptions table
    if (subscription?.stripe_customer_id) {
      stripeCustomerId = subscription.stripe_customer_id
    } else {
      // Fall back to users table
      const userStripeCheck = await sql`
        SELECT stripe_customer_id 
        FROM users 
        WHERE id = ${neonUser.id} 
        AND stripe_customer_id IS NOT NULL
        LIMIT 1
      `
      if (userStripeCheck.length > 0 && userStripeCheck[0].stripe_customer_id) {
        stripeCustomerId = userStripeCheck[0].stripe_customer_id
      }
    }

    const userInfo = await sql`
      SELECT 
        id,
        email,
        display_name as name,
        profile_image_url as avatar,
        profession as bio,
        created_at,
        gender,
        ethnicity
      FROM users 
      WHERE id = ${neonUser.id}
      LIMIT 1
    `

    console.log("[v0] User info: Query returned", userInfo.length, "rows")

    if (userInfo.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userInfo[0]

    let physicalPreferences = null
    try {
      const brandData = await sql`
        SELECT physical_preferences
        FROM user_personal_brand
        WHERE user_id = ${neonUser.id}
        LIMIT 1
      `
      physicalPreferences = brandData.length > 0 ? brandData[0].physical_preferences : null
    } catch (error: any) {
      // Column doesn't exist yet - gracefully handle by returning null
      if (error?.code === "42703") {
        console.log("[v0] Physical preferences column doesn't exist yet - needs migration")
      } else {
        // Re-throw other errors
        throw error
      }
    }

    console.log("[v0] User info: Returning response")

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name || null,
      avatar: user.avatar,
      bio: user.bio,
      instagram: null,
      location: null,
      product_type: subscription?.product_type || null,
      plan: subscription?.product_type || "free",
      memberSince: user.created_at,
      gender: user.gender,
      ethnicity: user.ethnicity,
      physical_preferences: physicalPreferences,
      stripe_customer_id: stripeCustomerId,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            productType: subscription.product_type,
          }
        : null,
    })
  } catch (error) {
    console.error("[v0] Error in user info API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
