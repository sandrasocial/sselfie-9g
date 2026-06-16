import { type NextRequest, NextResponse } from "next/server"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getSuiteAccess } from "@/lib/trial/suite-trial"
import { startVideoGeneration, VideoGenerationError } from "@/lib/maya/video-generation-service"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, { maxRequests: 12, windowMs: 60000 })
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "Too many video requests. Please wait a moment before trying again.",
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

    if (!isAdminEmail(user.email)) {
      const access = await getSuiteAccess(String(neonUser.id))
      if (access.level !== "member" && access.level !== "trial") {
        return NextResponse.json(
          {
            error: "Video-making is paused. Join the SUITE to keep creating.",
            code: "generation_locked",
            action: "open_membership_checkout",
          },
          { status: 403 },
        )
      }
    }

    const body = await request.json()
    const result = await startVideoGeneration({
      userId: neonUser.id,
      imageUrl: body.imageUrl,
      imageId: body.imageId,
      motionPrompt: body.motionPrompt,
      imageDescription: body.imageDescription,
      category: body.category,
      source: "app-v3-video",
    })

    return NextResponse.json({
      success: true,
      videoId: result.videoId,
      predictionId: result.predictionId,
      status: result.status,
      estimatedTime: "1-3 minutes",
      creditsDeducted: result.creditsDeducted,
      newBalance: result.newBalance,
    })
  } catch (error) {
    if (error instanceof VideoGenerationError) {
      return NextResponse.json(error.payload, { status: error.status })
    }
    console.error("[app-v3-video] Failed to start video generation:", error)
    return NextResponse.json({ error: "Failed to generate video" }, { status: 500 })
  }
}
