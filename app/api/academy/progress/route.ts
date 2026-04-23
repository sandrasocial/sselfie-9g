import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { completeLesson, getLessonCourseProductId, updateVideoWatchTime } from "@/lib/data/academy"
import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"

type QueryableSql = typeof sql & {
  query: <T = Record<string, unknown>>(queryText: string, params?: unknown[]) => Promise<T[]>
}

async function requireLessonAccess(userId: string, lessonId: number) {
  const productId = await getLessonCourseProductId(lessonId)
  if (!productId || !(await userHasAcademyProductAccess(userId, productId))) {
    return {
      hasAccess: false,
      requiredProductId: productId,
    }
  }

  return {
    hasAccess: true,
    requiredProductId: productId,
  }
}

async function recalculateCourseProgress(userId: string, lessonId: number) {
  const db = sql as QueryableSql
  const lessonRows = await db.query<{ course_id: number }>(
    "SELECT course_id FROM academy_lessons WHERE id = $1 LIMIT 1",
    [lessonId]
  )

  const courseId = lessonRows[0]?.course_id
  if (!courseId) {
    return
  }

  const statsRows = await db.query<{ total_lessons: string; completed_lessons: string }>(
    `SELECT
       COUNT(al.id)::text AS total_lessons,
       COUNT(ulp.id) FILTER (WHERE ulp.status = 'completed')::text AS completed_lessons
     FROM academy_lessons al
     LEFT JOIN user_lesson_progress ulp
       ON ulp.lesson_id = al.id
      AND ulp.user_id = $1
     WHERE al.course_id = $2`,
    [userId, courseId]
  )

  const totalLessons = Number(statsRows[0]?.total_lessons || 0)
  const completedLessons = Number(statsRows[0]?.completed_lessons || 0)
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  await db.query(
    `UPDATE user_academy_enrollments
        SET progress_percentage = $3,
            completed_at = CASE WHEN $3 = 100 THEN NOW() ELSE NULL END,
            last_accessed_at = NOW()
      WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId, progressPercentage]
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lessonId = Number.parseInt(String(body?.lessonId || ""), 10)
    const action = typeof body?.action === "string" ? body.action : null
    const watchTimeSeconds = body?.watchTimeSeconds

    if (!Number.isFinite(lessonId) || (watchTimeSeconds === undefined && !action)) {
      return NextResponse.json({ error: "Missing lessonId or progress payload" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyUser()
    const access = await requireLessonAccess(neonUser.id, lessonId)
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error: "Academy product access required",
          hasAccess: false,
          requiredProductId: access.requiredProductId,
        },
        { status: 403 }
      )
    }

    const db = sql as QueryableSql

    if (action === "start") {
      await db.query(
        `INSERT INTO user_lesson_progress (user_id, lesson_id, status, last_accessed_at)
         VALUES ($1, $2, 'in_progress', NOW())
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET
           status = CASE
             WHEN user_lesson_progress.status = 'completed' THEN 'completed'
             ELSE 'in_progress'
           END,
           last_accessed_at = NOW()`,
        [neonUser.id, lessonId]
      )

      return NextResponse.json({
        success: true,
        hasAccess: true,
        action: "start",
      })
    }

    if (action === "complete") {
      await completeLesson(neonUser.id, lessonId)

      return NextResponse.json({
        success: true,
        hasAccess: true,
        action: "complete",
      })
    }

    if (action === "incomplete") {
      await db.query(
        `INSERT INTO user_lesson_progress (user_id, lesson_id, status, completed_at, last_accessed_at)
         VALUES ($1, $2, 'in_progress', NULL, NOW())
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET
           status = 'in_progress',
           completed_at = NULL,
           last_accessed_at = NOW()`,
        [neonUser.id, lessonId]
      )
      await recalculateCourseProgress(neonUser.id, lessonId)

      return NextResponse.json({
        success: true,
        hasAccess: true,
        action: "incomplete",
      })
    }

    const progress = await updateVideoWatchTime(neonUser.id, lessonId, watchTimeSeconds)

    return NextResponse.json({
      success: true,
      hasAccess: true,
      progress,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error updating progress:", error)
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const lessonId = Number.parseInt(String(body?.lessonId || ""), 10)

    if (!Number.isFinite(lessonId) || lessonId <= 0) {
      return NextResponse.json({ error: "Missing lessonId" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyUser()
    const access = await requireLessonAccess(neonUser.id, lessonId)
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error: "Academy product access required",
          hasAccess: false,
          requiredProductId: access.requiredProductId,
        },
        { status: 403 }
      )
    }

    const progress = await completeLesson(neonUser.id, lessonId)

    return NextResponse.json({
      success: true,
      hasAccess: true,
      progress,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error marking lesson complete:", error)
    return NextResponse.json({ error: "Failed to mark lesson complete" }, { status: 500 })
  }
}
