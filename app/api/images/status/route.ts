import { type NextRequest, NextResponse } from "next/server"
import { getReplicateClient } from "@/lib/replicate-client"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const predictionId = searchParams.get("predictionId")

    if (!predictionId) {
      return NextResponse.json({ error: "Missing predictionId" }, { status: 400 })
    }

    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.get(predictionId)

    if (prediction.status === "succeeded") {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      return NextResponse.json({
        status: "succeeded",
        imageUrl,
      })
    }

    if (prediction.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    return NextResponse.json({
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] Error checking image status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
