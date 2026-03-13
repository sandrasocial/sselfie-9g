import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getExerciseCourseProductId, submitExercise } from "@/lib/data/academy"
import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const exerciseId = Number.parseInt(String(body?.exerciseId || ""), 10)
    const answer = String(body?.answer || "").trim()
    const isCorrect = typeof body?.isCorrect === "boolean" ? body.isCorrect : false

    if (!Number.isFinite(exerciseId) || !answer) {
      return NextResponse.json({ error: "Missing exerciseId or answer" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyUser()
    const productId = await getExerciseCourseProductId(exerciseId)

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

    await submitExercise(neonUser.id, exerciseId, answer, isCorrect)

    return NextResponse.json({
      success: true,
      hasAccess: true,
      exerciseId,
      isCorrect,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error submitting exercise:", error)
    return NextResponse.json({ error: "Failed to submit exercise" }, { status: 500 })
  }
}
