import { NextResponse } from "next/server"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { getCourses } from "@/lib/data/academy"

export async function GET() {
  try {
    const { neonUser } = await requireAcademyUser()
    const [courses, entitlementState] = await Promise.all([
      getCourses(),
      getAcademyEntitlementState(neonUser.id),
    ])

    const accessibleProductIds = new Set(entitlementState.accessibleProductIds)
    const visibleCourses = courses.filter(
      course => course.product_id && accessibleProductIds.has(course.product_id)
    )

    return NextResponse.json({
      hasAccess: visibleCourses.length > 0 || entitlementState.membershipActive,
      courses: visibleCourses,
      productType: entitlementState.membershipActive
        ? "sselfie_studio_membership"
        : visibleCourses.length > 0
          ? "academy_purchase"
          : "free",
      userTier: entitlementState.membershipActive
        ? "sselfie_studio_membership"
        : visibleCourses.length > 0
          ? "academy_purchase"
          : "free",
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error fetching courses:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}
