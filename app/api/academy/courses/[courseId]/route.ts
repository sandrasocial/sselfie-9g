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
    const progressData = await getUserCourseProgress(neonUser.id.toString(), Number.parseInt(courseId))

    const enrichedCourse = {
      ...course,
      progress_percentage: progressData?.enrollment?.progress_percentage ?? 0,
      completed_lessons: progressData?.lessonProgress?.filter((lp: any) => lp.status === "completed").length ?? 0,
      lesson_count: course.lessons?.length ?? 0,
      is_completed: (progressData?.enrollment?.progress_percentage ?? 0) >= 100,
      certificate_url: progressData?.enrollment?.certificate_url ?? null,
    }

    console.log("[v0] Course found:", enrichedCourse.title, "with", enrichedCourse.lessons?.length || 0, "lessons")
    console.log("[v0] User progress:", enrichedCourse.progress_percentage, "%")

    return NextResponse.json({
      course: enrichedCourse,
      progress: progressData,
    })
  } catch (error) {
    console.error("[v0] Error fetching course details:", error)
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 })
  }
}
