import { NextResponse } from "next/server"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getUserEnrolledCourses } from "@/lib/data/academy"

export async function GET() {
  try {
    const { neonUser } = await requireAcademyUser()
    const [enrolledCourses, entitlementState] = await Promise.all([
      getUserEnrolledCourses(neonUser.id),
      getAcademyEntitlementState(neonUser.id),
    ])

    const accessibleProductIds = new Set(entitlementState.accessibleProductIds)
    const courses = enrolledCourses.filter(
      course => course.product_id && accessibleProductIds.has(course.product_id)
    )

    return NextResponse.json({
      hasAccess: courses.length > 0,
      courses,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error fetching enrolled courses:", error)
    return NextResponse.json({ error: "Failed to fetch enrolled courses" }, { status: 500 })
  }
}
