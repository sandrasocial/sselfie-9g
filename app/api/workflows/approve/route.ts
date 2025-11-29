import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { marketingAutomationAgent } from "@/agents/marketing/marketingAutomationAgent"

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

    const workflowResult = await sql`
      SELECT 
        wq.*,
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

    await sql`
      UPDATE workflow_queue
      SET status = 'approved', updated_at = NOW()
      WHERE id = ${workflowId}
    `

    await marketingAutomationAgent.runApprovedWorkflow(workflow)

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
          'MarketingAutomationAgent',
          'workflow_approved',
          ${`Workflow ${workflow.workflow_type} approved and executed for ${workflow.subscriber_email}`},
          ${JSON.stringify({ workflowId, workflowType: workflow.workflow_type, subscriberEmail: workflow.subscriber_email })},
          NOW()
        )
      `
    } catch (err) {
      console.log("[Workflows] agent_activity table may not exist, skipping log")
    }

    return NextResponse.json({ status: "approved", workflowId })
  } catch (error) {
    console.error("Error approving workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
