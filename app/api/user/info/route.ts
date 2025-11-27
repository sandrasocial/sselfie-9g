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

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] User info: Neon user ID:", neonUser.id)

    const subscription = await getUserSubscription(neonUser.id)

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

    console.log("[v0] User info: Returning response")

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name || user.email?.split("@")[0],
      avatar: user.avatar,
      bio: user.bio,
      instagram: null,
      location: null,
      product_type: subscription?.product_type || null,
      plan: subscription?.product_type || "free",
      memberSince: user.created_at,
      gender: user.gender,
      ethnicity: user.ethnicity,
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
