import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import {
  checkTrainedModelGeneration,
  TrainedModelGenerationError,
} from "@/lib/maya/trained-model-generation-service"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"

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
    const generationId = searchParams.get("generationId")

    if (!predictionId || !generationId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const result = await checkTrainedModelGeneration({
      userId: neonUser.id,
      predictionId,
      generationId,
      source: "app_v3_custom_model",
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof TrainedModelGenerationError) {
      return NextResponse.json(error.payload, { status: error.status })
    }

    console.error("[app-v3-custom-model] Failed to check trained-model generation:", error)
    return NextResponse.json({ error: "Failed to check generation status" }, { status: 500 })
  }
}
