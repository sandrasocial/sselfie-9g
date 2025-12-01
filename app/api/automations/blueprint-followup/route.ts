import { NextRequest, NextResponse } from "next/server"
import { runBlueprintFollowUpPipeline } from "@/agents/pipelines/blueprintFollowUpPipeline"

/**
 * POST /api/automations/blueprint-followup
 * Trigger Blueprint Follow-Up Pipeline
 * Called when user downloads blueprint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriberId, email, name } = body

    if (!subscriberId || !email || !name) {
      return NextResponse.json(
        { error: "Missing required fields: subscriberId, email, name" },
        { status: 400 },
      )
    }

    console.log(`[BlueprintFollowUp] Triggering pipeline for ${email}`)

    const result = await runBlueprintFollowUpPipeline({
      subscriberId,
      email,
      name,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Pipeline failed",
          emailsScheduled: result.emailsScheduled,
          userTagged: result.userTagged,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      emailsScheduled: result.emailsScheduled,
      userTagged: result.userTagged,
    })
  } catch (error) {
    console.error("[BlueprintFollowUp] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

