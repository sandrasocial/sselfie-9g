import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { completeLesson, getLessonCourseProductId, updateVideoWatchTime } from "@/lib/data/academy"
import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lessonId = Number.parseInt(String(body?.lessonId || ""), 10)
    const watchTimeSeconds = body?.watchTimeSeconds

    if (!Number.isFinite(lessonId) || watchTimeSeconds === undefined) {
      return NextResponse.json({ error: "Missing lessonId or watchTimeSeconds" }, { status: 400 })
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
