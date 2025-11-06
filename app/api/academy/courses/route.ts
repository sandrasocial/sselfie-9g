import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCoursesForMembership } from "@/lib/data/academy"
import { getUserProductAccess, hasStudioMembership } from "@/lib/subscription"

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

    const hasAccess = await hasStudioMembership(neonUser.id)
    const productType = await getUserProductAccess(neonUser.id)

    console.log("[v0] User has Academy access:", hasAccess, "Product type:", productType)

    if (!hasAccess) {
      return NextResponse.json({
        courses: [],
        hasAccess: false,
        productType,
        message: "Academy access requires Studio Membership",
      })
    }

    // Get courses available for user's membership
    const courses = await getCoursesForMembership()

    console.log("[v0] Found", courses.length, "courses for Studio Membership")

    return NextResponse.json({
      courses,
      hasAccess: true,
      productType,
    })
  } catch (error) {
    console.error("[v0] Error fetching courses:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}
