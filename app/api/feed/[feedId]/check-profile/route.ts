import { type NextRequest, NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { withAuth } from "@/lib/auth/with-auth"

async function handleCheckProfile(
  {
    request,
  }: {
    request: NextRequest | Request
  },
) {
  try {
    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")

    if (!predictionId) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 })
    }

    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.get(predictionId)

    if (prediction.status === "succeeded") {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      return NextResponse.json({
        status: "succeeded",
        imageUrl,
      })
    } else if (prediction.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: prediction.error,
      })
    } else {
      return NextResponse.json({
        status: prediction.status,
      })
    }
  } catch (error) {
    console.error("[v0] Error checking profile image:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const GET = withAuth(handleCheckProfile, {
  resolveUser: getUserByAuthId,
})
