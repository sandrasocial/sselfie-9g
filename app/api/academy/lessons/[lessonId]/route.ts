import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getLessonById, getLessonExercises, getUserLessonProgress } from "@/lib/data/academy"

export async function GET(req: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const { lessonId } = await params

    console.log("[v0] Academy lesson details API called for lesson:", lessonId)

    if (!lessonId || lessonId === "undefined" || lessonId === "null") {
      console.error("[v0] Invalid lessonId received:", lessonId)
      return NextResponse.json({ error: "Invalid lesson ID" }, { status: 400 })
    }

    const lessonIdNum = Number.parseInt(lessonId, 10)

    if (Number.isNaN(lessonIdNum)) {
      console.error("[v0] lessonId is NaN after parsing:", lessonId)
      return NextResponse.json({ error: "Invalid lesson ID format" }, { status: 400 })
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

    // Get lesson details
    const lesson = await getLessonById(lessonIdNum)

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Transform lesson to include duration_minutes for backward compatibility
    const lessonWithDuration = {
      ...lesson,
      duration_minutes: lesson.duration_seconds ? Math.floor(lesson.duration_seconds / 60) : null,
    }

    // Get exercises for this lesson
    const exercises = await getLessonExercises(lessonIdNum)

    // Get user's progress for this lesson
    const progress = await getUserLessonProgress(neonUser.id, lessonIdNum)

    console.log("[v0] Lesson found:", lesson.title)
    console.log("[v0] Video URL:", lesson.video_url ? `${lesson.video_url.substring(0, 80)}...` : "null")
    console.log("[v0] Exercises:", exercises.length)
    console.log("[v0] User progress:", progress?.is_completed ? "Completed" : "In Progress")

    return NextResponse.json({
      lesson: lessonWithDuration,
      exercises,
      progress,
    })
  } catch (error) {
    console.error("[v0] Error fetching lesson details:", error)
    return NextResponse.json({ error: "Failed to fetch lesson details" }, { status: 500 })
  }
}
