import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { enrollUserInCourse, getCourseProductId } from "@/lib/data/academy"
import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const courseId = Number.parseInt(String(body?.courseId || ""), 10)

    if (!Number.isFinite(courseId) || courseId <= 0) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 })
    }

    const { neonUser } = await requireAcademyUser()
    const productId = await getCourseProductId(courseId)

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

    const enrollment = await enrollUserInCourse(neonUser.id, courseId)

    return NextResponse.json({
      success: true,
      hasAccess: true,
      enrollment,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error enrolling user:", error)
    return NextResponse.json({ error: "Failed to enroll in course" }, { status: 500 })
  }
}
