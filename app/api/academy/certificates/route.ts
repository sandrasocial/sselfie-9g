import { type NextRequest, NextResponse } from "next/server"

import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { generateCertificate, getCourseProductId, getUserCertificates } from "@/lib/data/academy"
import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const courseId = Number.parseInt(String(body?.courseId || ""), 10)
    const certificateUrlFromBody =
      typeof body?.certificateUrl === "string" ? body.certificateUrl : null

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://sselfie.ai"
    const resolvedCertificateUrl =
      certificateUrlFromBody || `${baseUrl}/academy/certificates/${neonUser.id}/${courseId}`

    await generateCertificate(neonUser.id, courseId, resolvedCertificateUrl)

    const certificates = await getUserCertificates(neonUser.id)
    const certificate = certificates.find((item: any) => item.course_id === courseId) || null
    if (!certificate) {
      return NextResponse.json(
        { error: "Course not completed or certificate already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      hasAccess: true,
      certificate,
      certificateUrl: resolvedCertificateUrl,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error generating certificate:", error)
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { neonUser } = await requireAcademyUser()
    const certificates = await getUserCertificates(neonUser.id)

    return NextResponse.json({
      hasAccess: true,
      certificates,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[v0] Error fetching certificates:", error)
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
  }
}
