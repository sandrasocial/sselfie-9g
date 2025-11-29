import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getDb } from "@/lib/db"

/**
 * POST /api/admin/automation/email/approve
 * Change queue entry status to 'approved'
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const body = await request.json()
    const { emailId } = body

    if (!emailId) {
      return NextResponse.json({ error: "emailId is required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE marketing_email_queue
      SET status = 'approved', updated_at = NOW()
      WHERE id = ${emailId}
      RETURNING id, email, subject, status
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Email not found in queue" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      email: result[0],
      message: "Email approved successfully",
    })
  } catch (error) {
    console.error("[Automation] Error approving email:", error)
    return NextResponse.json(
      { error: "Failed to approve email", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
