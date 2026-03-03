import { NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { withAuth } from "@/lib/auth/with-auth"

async function handleCheckHighlight(
  {
    request,
  }: {
    request: Request | import("next/server").NextRequest
  },
) {
  try {
    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")
    const highlightId = searchParams.get("highlightId")

    if (!predictionId || !highlightId) {
      return NextResponse.json({ error: "Missing predictionId or highlightId" }, { status: 400 })
    }

    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.get(predictionId)

    if (prediction.status === "succeeded" && prediction.output) {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      return NextResponse.json({
        status: "succeeded",
        imageUrl,
        highlightId,
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
    console.error("[v0] Error checking highlight status:", error)
    return NextResponse.json({ error: "Failed to check highlight status" }, { status: 500 })
  }
}

export const GET = withAuth(handleCheckHighlight, {
  resolveUser: getUserByAuthId,
})
