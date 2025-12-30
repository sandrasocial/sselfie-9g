import { type NextRequest, NextResponse } from "next/server"
import { getReplicateClient } from "@/lib/replicate-client"

export async function POST(req: NextRequest) {
  try {
    const { predictionId } = await req.json()

    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.get(predictionId)

    console.log("[v0] Checking prediction status:", prediction.status)

    if (prediction.status === "succeeded" && prediction.output) {
      // Flux returns output as array or string
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      return NextResponse.json({
        success: true,
        status: "succeeded",
        imageUrl,
      })
    } else if (prediction.status === "failed") {
      return NextResponse.json({
        success: false,
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    // Still processing
    return NextResponse.json({
      success: true,
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] Error checking image status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check status" },
      { status: 500 },
    )
  }
}
