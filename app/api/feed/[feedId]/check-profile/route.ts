import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"

export async function GET(request: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")

    if (!predictionId) {
      return NextResponse.json({ error: "Prediction ID is required" }, { status: 400 })
    }

    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
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
