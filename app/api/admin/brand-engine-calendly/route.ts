import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * POST /api/admin/brand-engine-calendly
 * Mark an application as "Calendly Sent"
 */
export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json()

    if (!applicationId) {
      return NextResponse.json({
        success: false,
        error: "Application ID is required."
      }, { status: 400 })
    }

    const sql = getDb()

    await sql`
      UPDATE brand_engine_applications
      SET calendly_sent = TRUE
      WHERE id = ${applicationId}
    `

    return NextResponse.json({
      success: true,
      message: "Marked as Calendly Sent"
    })

  } catch (error) {
    console.error("[Brand Engine Calendly] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Something went wrong."
    }, { status: 500 })
  }
}
