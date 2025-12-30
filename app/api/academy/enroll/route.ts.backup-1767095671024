import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { enrollUserInCourse } from "@/lib/data/academy"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { courseId } = body

    console.log("[v0] Enroll user in course:", courseId)

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 })
    }

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

    // Enroll user
    const enrollment = await enrollUserInCourse(neonUser.id, Number.parseInt(courseId))

    console.log("[v0] User enrolled successfully:", enrollment)

    return NextResponse.json({
      success: true,
      enrollment,
    })
  } catch (error) {
    console.error("[v0] Error enrolling user:", error)
    return NextResponse.json({ error: "Failed to enroll in course" }, { status: 500 })
  }
}
