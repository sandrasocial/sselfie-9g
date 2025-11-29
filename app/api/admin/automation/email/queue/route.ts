import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getDb } from "@/lib/db"

/**
 * GET /api/admin/automation/email/queue
 * List items in marketing_email_queue
 */
export async function GET(request: NextRequest) {
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

    const queueItems = await sql`
      SELECT 
        id,
        user_id,
        email,
        subject,
        html,
        status,
        scheduled_for,
        sent_at,
        error_message,
        created_at,
        updated_at
      FROM marketing_email_queue
      ORDER BY 
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'sent' THEN 3
          WHEN 'failed' THEN 4
        END,
        scheduled_for ASC
      LIMIT 100
    `

    return NextResponse.json({
      success: true,
      queue: queueItems,
      total: queueItems.length,
    })
  } catch (error) {
    console.error("[Automation] Error fetching email queue:", error)
    return NextResponse.json(
      { error: "Failed to fetch email queue", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
