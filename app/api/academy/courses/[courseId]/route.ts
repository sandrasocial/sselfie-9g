import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { enrollUserInCourse, getCourseWithLessons, getUserCourseProgress } from "@/lib/data/academy"
import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"

export async function GET(req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const { courseId } = await params
    const parsedCourseId = Number.parseInt(courseId, 10)
    if (!Number.isFinite(parsedCourseId) || parsedCourseId <= 0) {
      return NextResponse.json({ error: "Invalid courseId" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyUser()
    const course = await getCourseWithLessons(parsedCourseId)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (
      !course.product_id ||
      !(await userHasAcademyProductAccess(neonUser.id, course.product_id))
    ) {
      return NextResponse.json(
        {
          error: "Academy product access required",
          hasAccess: false,
          requiredProductId: course.product_id,
        },
        { status: 403 }
      )
    }

    await enrollUserInCourse(neonUser.id, parsedCourseId)

    const progressData = await getUserCourseProgress(neonUser.id, parsedCourseId)
    const lessonsWithProgress = course.lessons?.map(lesson => {
      const lessonProgress = progressData?.lessonProgress?.find(
        (lp: any) => lp.lesson_id === lesson.id
      )
      return {
        ...lesson,
        is_completed: lessonProgress?.status === "completed",
        is_locked: false,
      }
    })

    const enrichedCourse = {
      ...course,
      lessons: lessonsWithProgress,
      progress_percentage: progressData?.enrollment?.progress_percentage ?? 0,
      completed_lessons:
        progressData?.lessonProgress?.filter((lp: any) => lp.status === "completed").length ?? 0,
      lesson_count: course.lessons?.length ?? 0,
      is_completed: (progressData?.enrollment?.progress_percentage ?? 0) >= 100,
      certificate_url: progressData?.enrollment?.certificate_url ?? null,
    }

    return NextResponse.json({
      hasAccess: true,
      course: enrichedCourse,
      progress: progressData,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error fetching course details:", error)
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 })
  }
}
