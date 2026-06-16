import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { checkVideoGeneration, VideoGenerationError } from "@/lib/maya/video-generation-service"

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")
    const videoId = searchParams.get("videoId")
    if (!predictionId || !videoId) {
      return NextResponse.json({ error: "Missing predictionId or videoId" }, { status: 400 })
    }

    const result = await checkVideoGeneration({
      userId: neonUser.id,
      predictionId,
      videoId,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof VideoGenerationError) {
      return NextResponse.json(error.payload, { status: error.status })
    }
    console.error("[app-v3-video] Failed to check video generation:", error)
    return NextResponse.json({ error: "Failed to check video status" }, { status: 500 })
  }
}
