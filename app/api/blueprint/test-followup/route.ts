/**
 * Test Blueprint Follow-Up Workflow
 * Manual trigger for testing the 3-day email sequence
 *
 * Usage: /api/blueprint/test-followup?id=123
 */

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { MarketingAutomationAgent } from "@/agents/marketing/marketingAutomationAgent"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const subscriberId = searchParams.get("id")

    if (!subscriberId) {
      return NextResponse.json({ error: "Missing subscriber ID" }, { status: 400 })
    }

    // Fetch subscriber data
    const result = await sql`
      SELECT id, email, name, pdf_url, maya_alignment_notes,
             followup_0_sent_at, followup_1_sent_at, followup_2_sent_at
      FROM blueprint_subscribers
      WHERE id = ${Number(subscriberId)}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 })
    }

    const subscriber = result[0]

    // Trigger follow-up workflow manually
    const agent = new MarketingAutomationAgent()
    const workflowResult = await agent.startBlueprintFollowUpWorkflow(
      Number(subscriberId),
      subscriber.email,
      subscriber.name || "Brand Builder",
    )

    return NextResponse.json({
      success: true,
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name,
        pdf_url: subscriber.pdf_url,
        maya_alignment_notes: subscriber.maya_alignment_notes,
      },
      followup_status: {
        day_0_sent: !!subscriber.followup_0_sent_at,
        day_1_sent: !!subscriber.followup_1_sent_at,
        day_2_sent: !!subscriber.followup_2_sent_at,
      },
      workflow_triggered: workflowResult.success,
      message: "Follow-up workflow manually triggered",
    })
  } catch (error) {
    console.error("[TestFollowUp] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to test follow-up workflow" },
      { status: 500 },
    )
  }
}
