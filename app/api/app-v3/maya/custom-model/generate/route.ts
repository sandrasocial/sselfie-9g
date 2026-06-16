import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import {
  startTrainedModelGeneration,
  TrainedModelGenerationError,
} from "@/lib/maya/trained-model-generation-service"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "Too many image generation requests. Please wait a moment before trying again.",
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 },
    )
  }

  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    const body = await request.json()
    const result = await startTrainedModelGeneration({
      userId: neonUser.id,
      conceptTitle: body.conceptTitle,
      conceptDescription: body.conceptDescription,
      conceptPrompt: body.conceptPrompt,
      category: body.category,
      referenceImageUrl: body.referenceImageUrl,
      addTextOverlay: body.addTextOverlay,
      textOverlayConfig: body.textOverlayConfig,
      isHighlight: body.isHighlight,
      customSettings: body.customSettings,
      enhancedAuthenticity: body.enhancedAuthenticity,
      source: "app-v3-custom-model",
    })

    return NextResponse.json({
      success: true,
      generationId: result.generationId,
      predictionId: result.predictionId,
      status: "processing",
      creditsDeducted: result.creditsDeducted,
      newBalance: result.newBalance,
    })
  } catch (error) {
    if (error instanceof TrainedModelGenerationError) {
      return NextResponse.json(error.payload, { status: error.status })
    }

    console.error("[app-v3-custom-model] Failed to start trained-model generation:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
