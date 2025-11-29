import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { workflowId } = await request.json()

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 })
    }

    await sql`
      UPDATE workflow_queue
      SET status = 'rejected', updated_at = NOW()
      WHERE id = ${workflowId}
    `

    try {
      await sql`
        INSERT INTO agent_activity (
          agent_name,
          activity_type,
          description,
          metadata,
          created_at
        )
        VALUES (
          'AdminSupervisorAgent',
          'workflow_rejected',
          ${`Workflow ${workflowId} rejected by admin`},
          ${JSON.stringify({ workflowId })},
          NOW()
        )
      `
    } catch (err) {
      console.log("[Workflows] agent_activity table may not exist, skipping log")
    }

    return NextResponse.json({ status: "rejected", workflowId })
  } catch (error) {
    console.error("Error rejecting workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
