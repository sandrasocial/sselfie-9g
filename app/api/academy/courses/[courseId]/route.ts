import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getCourseWithLessons, getUserCourseProgress } from "@/lib/data/academy"

export async function GET(req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const { courseId } = params

    console.log("[v0] Academy course details API called for course:", courseId)

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

    // Get course with lessons
    const course = await getCourseWithLessons(Number.parseInt(courseId))

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Get user's progress for this course
    const progress = await getUserCourseProgress(neonUser.id, Number.parseInt(courseId))

    console.log("[v0] Course found:", course.title, "with", course.lessons?.length || 0, "lessons")
    console.log("[v0] User progress:", progress?.completion_percentage || 0, "%")

    return NextResponse.json({
      course,
      progress,
    })
  } catch (error) {
    console.error("[v0] Error fetching course details:", error)
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 })
  }
}
