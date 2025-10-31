import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getLessonById, getLessonExercises, getUserLessonProgress } from "@/lib/data/academy"

export async function GET(req: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const { lessonId } = params

    console.log("[v0] Academy lesson details API called for lesson:", lessonId)

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

    // Get lesson details
    const lesson = await getLessonById(Number.parseInt(lessonId))

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Get exercises for this lesson
    const exercises = await getLessonExercises(Number.parseInt(lessonId))

    // Get user's progress for this lesson
    const progress = await getUserLessonProgress(neonUser.id, Number.parseInt(lessonId))

    console.log("[v0] Lesson found:", lesson.title)
    console.log("[v0] Exercises:", exercises.length)
    console.log("[v0] User progress:", progress?.is_completed ? "Completed" : "In Progress")

    return NextResponse.json({
      lesson,
      exercises,
      progress,
    })
  } catch (error) {
    console.error("[v0] Error fetching lesson details:", error)
    return NextResponse.json({ error: "Failed to fetch lesson details" }, { status: 500 })
  }
}
