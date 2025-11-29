import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/security/require-admin"

/**
 * Workflow Router API
 * Routes blueprint engagement events to appropriate workflows
 * DOES NOT execute workflows, only queues them for approval
 */
export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) return guard

    const body = await request.json()
    const { subscriberId, event } = body

    if (!subscriberId || !event) {
      return NextResponse.json({ error: "subscriberId and event are required" }, { status: 400 })
    }

    // Load subscriber from blueprint_subscribers
    const subscribers = await sql`
      SELECT 
        id, 
        email, 
        name, 
        lead_intelligence,
        blueprint_completed,
        cta_clicked,
        pdf_downloaded
      FROM blueprint_subscribers
      WHERE id = ${subscriberId}
      LIMIT 1
    `

    if (subscribers.length === 0) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 })
    }

    const subscriber = subscribers[0]
    const intelligence = subscriber.lead_intelligence || {}

    // Determine recommended workflow based on event
    let workflowType: string

    switch (event) {
      case "subscribed":
        workflowType = "blueprint_welcome"
        break
      case "blueprint_completed":
        workflowType = "blueprint_nurture"
        break
      case "cta_clicked":
        workflowType = "blueprint_upsell"
        break
      case "pdf_downloaded":
        workflowType = "blueprint_nurture"
        break
      default:
        return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    // Add to workflow_queue (NOT executed, just queued for approval)
    const result = await sql`
      INSERT INTO workflow_queue (
        subscriber_id,
        workflow_type,
        payload,
        status,
        created_at
      ) VALUES (
        ${subscriber.id},
        ${workflowType},
        ${JSON.stringify({
          subscriberId: subscriber.id,
          email: subscriber.email,
          name: subscriber.name,
          event,
          intelligence,
          timestamp: new Date().toISOString(),
        })},
        'pending',
        NOW()
      )
      RETURNING id, workflow_type, status
    `

    const queuedWorkflow = result[0]

    console.log(`[WorkflowRouter] Queued workflow: ${workflowType} for subscriber ${subscriberId} (event: ${event})`)

    return NextResponse.json({
      status: "queued",
      workflow: queuedWorkflow.workflow_type,
      queueId: queuedWorkflow.id,
    })
  } catch (error) {
    console.error("[WorkflowRouter] Error routing workflow:", error)
    return NextResponse.json(
      {
        error: "Failed to route workflow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
