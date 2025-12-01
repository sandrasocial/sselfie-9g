import { NextRequest, NextResponse } from "next/server"
import { runRevenueRecoveryPipeline, type RecoveryType } from "@/agents/pipelines/revenueRecoveryPipeline"

/**
 * POST /api/automations/revenue-recovery
 * Trigger Revenue Recovery Pipeline
 * Handles: winback, upgrade, abandoned_checkout
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, userId, email, context } = body

    if (!type || !userId || !email) {
      return NextResponse.json(
        { error: "Missing required fields: type, userId, email" },
        { status: 400 },
      )
    }

    const validTypes: RecoveryType[] = ["winback", "upgrade", "abandoned_checkout"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      )
    }

    console.log(`[RevenueRecovery] Triggering ${type} pipeline for ${email}`)

    const result = await runRevenueRecoveryPipeline({
      type: type as RecoveryType,
      userId,
      email,
      context,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Pipeline failed",
          emailScheduled: result.emailScheduled,
          messageGenerated: result.messageGenerated,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      emailScheduled: result.emailScheduled,
      messageGenerated: result.messageGenerated,
    })
  } catch (error) {
    console.error("[RevenueRecovery] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

