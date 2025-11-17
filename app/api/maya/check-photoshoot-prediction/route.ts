import { type NextRequest, NextResponse } from "next/server"
import { getReplicateClient } from "@/lib/replicate-client"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("id")

    if (!predictionId) {
      return NextResponse.json({ error: "Missing prediction ID" }, { status: 400 })
    }

    console.log("[v0] 📊 Checking photoshoot prediction:", predictionId)

    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.get(predictionId)

    console.log("[v0] 📊 Prediction status:", prediction.status)

    if (prediction.status === "succeeded" && prediction.output) {
      const imageUrls = Array.isArray(prediction.output) ? prediction.output : [prediction.output]
      
      console.log("[v0] ✅ Batch succeeded with", imageUrls.length, "images")

      return NextResponse.json({
        status: "succeeded",
        output: imageUrls, // Return array of images
      })
    } else if (prediction.status === "failed") {
      console.log("[v0] ❌ Batch failed:", prediction.error)
      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    return NextResponse.json({
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] Error checking photoshoot prediction:", error)
    return NextResponse.json({ error: "Failed to check prediction status" }, { status: 500 })
  }
}
