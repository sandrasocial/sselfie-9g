import { NextResponse } from "next/server"
import { getSubscribersNeedingPrediction, evaluateConversionLikelihood } from "@/agents/admin/adminSupervisorAgent"

/**
 * POST /api/automations/predict
 * Runs prediction sweep for subscribers needing updates
 * Admin-only endpoint for manual triggering
 */
export async function POST() {
  try {
    console.log("[API] Running prediction sweep...")

    const subscribers = await getSubscribersNeedingPrediction()
    console.log(`[API] Found ${subscribers.length} subscribers needing prediction`)

    const results = []

    for (const subscriber of subscribers) {
      const result = await evaluateConversionLikelihood(subscriber)
      results.push({
        subscriberId: subscriber.id,
        email: subscriber.email,
        success: result.success,
        prediction: result.prediction,
      })
    }

    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      total: subscribers.length,
      predicted: successCount,
      results,
    })
  } catch (error) {
    console.error("[API] Error running prediction sweep:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
