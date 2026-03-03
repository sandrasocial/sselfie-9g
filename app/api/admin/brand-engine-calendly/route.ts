import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { ensureBrandEngineApplicationsSchema } from "@/lib/brand-engine/applications"
import { requireAdmin } from "@/lib/admin-feature-flags"

/**
 * POST /api/admin/brand-engine-calendly
 * Mark an application as "Calendly Sent"
 */
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || "Unauthorized" },
        { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
      )
    }

    const { applicationId } = await req.json()

    if (!applicationId) {
      return NextResponse.json({
        success: false,
        error: "Application ID is required."
      }, { status: 400 })
    }

    const sql = getDb()
    await ensureBrandEngineApplicationsSchema(sql)

    await sql`
      UPDATE brand_engine_applications
      SET
        calendly_sent = TRUE,
        pipeline_stage = 'call_booked',
        status = 'calendly_sent',
        call_booked_at = COALESCE(call_booked_at, NOW()),
        updated_at = NOW()
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
