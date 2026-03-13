import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import {
  getLessonById,
  getLessonCourseProductId,
  getLessonExercises,
  getUserLessonProgress,
} from "@/lib/data/academy"
import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"

export async function GET(req: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const { lessonId } = await params
    const lessonIdNum = Number.parseInt(lessonId, 10)

    if (!Number.isFinite(lessonIdNum) || lessonIdNum <= 0) {
      return NextResponse.json({ error: "Invalid lesson ID" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyUser()
    const productId = await getLessonCourseProductId(lessonIdNum)

    if (!productId || !(await userHasAcademyProductAccess(neonUser.id, productId))) {
      return NextResponse.json(
        {
          error: "Academy product access required",
          hasAccess: false,
          requiredProductId: productId,
        },
        { status: 403 }
      )
    }

    const lesson = await getLessonById(lessonIdNum)
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const lessonWithDuration = {
      ...lesson,
      duration_minutes: lesson.duration_seconds ? Math.floor(lesson.duration_seconds / 60) : null,
    }

    const [exercises, progress] = await Promise.all([
      getLessonExercises(lessonIdNum),
      getUserLessonProgress(neonUser.id, lessonIdNum),
    ])

    return NextResponse.json({
      hasAccess: true,
      lesson: lessonWithDuration,
      exercises,
      progress,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error fetching lesson details:", error)
    return NextResponse.json({ error: "Failed to fetch lesson details" }, { status: 500 })
  }
}
