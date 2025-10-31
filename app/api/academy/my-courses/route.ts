import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserEnrolledCourses } from "@/lib/data/academy"

export async function GET() {
  try {
    console.log("[v0] Get user's enrolled courses API called")

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

    // Get enrolled courses with progress
    const enrolledCourses = await getUserEnrolledCourses(neonUser.id)

    console.log("[v0] User has", enrolledCourses.length, "enrolled courses")

    return NextResponse.json({
      courses: enrolledCourses,
    })
  } catch (error) {
    console.error("[v0] Error fetching enrolled courses:", error)
    return NextResponse.json({ error: "Failed to fetch enrolled courses" }, { status: 500 })
  }
}
