import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserSubscription } from "@/lib/subscription"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    console.log("[v0] Profile info API called")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[v0] Profile info: Not authenticated")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Profile info: Auth user ID:", authUser.id)

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      console.log("[v0] Profile info: Neon user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Profile info: Neon user ID:", neonUser.id)

    const sql = neon(process.env.DATABASE_URL!)

    const subscription = await getUserSubscription(neonUser.id)

    const userInfo = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.profile_image_url,
        u.created_at,
        up.bio,
        up.instagram_handle,
        up.location
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ${neonUser.id}
      LIMIT 1
    `

    console.log("[v0] Profile info: Query returned", userInfo.length, "rows")

    if (userInfo.length === 0) {
      console.log("[v0] Profile info: User not found in database")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const profile = userInfo[0]

    const response = {
      id: profile.id,
      email: profile.email,
      name: profile.display_name || "User",
      avatar: profile.profile_image_url || null,
      bio: profile.bio || null,
      instagram: profile.instagram_handle || null,
      location: profile.location || null,
      product_type: subscription?.product_type || null,
      plan: subscription?.product_type || "free", // Keep for backwards compatibility
      memberSince: profile.created_at,
    }

    console.log("[v0] Profile info: Returning response")
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error fetching profile info:", error)
    return NextResponse.json({ error: "Failed to fetch profile info" }, { status: 500 })
  }
}
