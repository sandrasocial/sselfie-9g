import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateCertificate, getUserCertificates } from "@/lib/data/academy"

// POST - Generate certificate for completed course
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { courseId } = body

    console.log("[v0] Generate certificate for course:", courseId)

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 })
    }

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

    // Generate certificate
    const certificate = await generateCertificate(neonUser.id, Number.parseInt(courseId))

    if (!certificate) {
      return NextResponse.json({ error: "Course not completed or certificate already exists" }, { status: 400 })
    }

    console.log("[v0] Certificate generated:", certificate.certificate_id)

    return NextResponse.json({
      success: true,
      certificate,
    })
  } catch (error) {
    console.error("[v0] Error generating certificate:", error)
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 })
  }
}

// GET - Get user's certificates
export async function GET() {
  try {
    console.log("[v0] Get user certificates API called")

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

    // Get certificates
    const certificates = await getUserCertificates(neonUser.id)

    console.log("[v0] User has", certificates.length, "certificates")

    return NextResponse.json({
      certificates,
    })
  } catch (error) {
    console.error("[v0] Error fetching certificates:", error)
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
  }
}
