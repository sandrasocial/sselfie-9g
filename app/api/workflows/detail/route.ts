import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get("id")

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 })
    }

    const workflowResult = await sql`
      SELECT 
        wq.id,
        wq.subscriber_id,
        wq.workflow_type,
        wq.status,
        wq.created_at,
        bs.email as subscriber_email,
        bs.name as subscriber_name,
        bs.lead_intelligence
      FROM workflow_queue wq
      LEFT JOIN blueprint_subscribers bs ON wq.subscriber_id = bs.id::text
      WHERE wq.id = ${workflowId}
      LIMIT 1
    `

    if (workflowResult.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const workflow = workflowResult[0]

    const drafts = await sql`
      SELECT id, title, type, content_json, created_at
      FROM content_drafts
      WHERE content_json->>'subscriberId' = ${workflow.subscriber_id}
      ORDER BY created_at DESC
      LIMIT 5
    `

    return NextResponse.json({
      workflow: {
        ...workflow,
        drafts,
      },
    })
  } catch (error) {
    console.error("Error fetching workflow detail:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
