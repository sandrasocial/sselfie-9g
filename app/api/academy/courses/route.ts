import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCoursesForTier } from "@/lib/data/academy"
import { getUserTier } from "@/lib/subscription"

export async function GET() {
  try {
    console.log("[v0] Academy courses API called")

    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[v0] Unauthorized - no auth user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] User not found in Neon")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Fetching courses for user:", neonUser.id)

    const userTier = await getUserTier(neonUser.id)
    console.log("[v0] User tier:", userTier)

    // Get courses available for user's tier
    const courses = await getCoursesForTier(userTier)

    console.log("[v0] Found", courses.length, "courses for tier:", userTier)

    return NextResponse.json({
      courses,
      userTier,
    })
  } catch (error) {
    console.error("[v0] Error fetching courses:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}
