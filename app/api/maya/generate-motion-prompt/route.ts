import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getMayaUserSnapshot } from "@/lib/maya/user-snapshot"
import {
  buildMayaMotionPromptInput,
  cleanGeneratedMotionPrompt,
  isMotionPromptReferenceImageUrl,
  resolveFluxPromptForMotion,
} from "@/lib/maya/video-motion-context"
import { generateMotionPromptWithVisionFallbacks } from "@/lib/maya/motion-prompt-llm"
import { auditPromptRoute } from "@/lib/generation/prompt/route-audit"
import { getMayaModelForTask, MAYA_LLM_NOT_CONFIGURED } from "@/lib/maya/openrouter"

const MOTION_PROMPT_SYSTEM = `You are Maya, SSELFIE Studio's brand-safe motion director for Wan 2.5 I2V.

Your job is to write one motion prompt that keeps identity consistency and creates elegant, believable movement.

Rules:
- Focus on natural movement from the existing image composition.
- Keep actions physically plausible and subtle-to-moderate.
- Avoid adding new people, outfits, locations, products, or scene changes.
- Avoid cinematic jargon overload and avoid generic hype language.
- Output exactly one line with no markdown, bullets, headings, or quotes.`

export async function POST(request: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { fluxPrompt, description, category, imageUrl } = body

    const effectiveFluxPrompt = resolveFluxPromptForMotion({ fluxPrompt, description, imageUrl })
    if (!effectiveFluxPrompt) {
      return NextResponse.json(
        { error: "FLUX prompt or description is required (or provide a valid image URL)" },
        { status: 400 },
      )
    }

    const snapshot = await getMayaUserSnapshot(neonUser.id)
    const promptInput = buildMayaMotionPromptInput({
      fluxPrompt: effectiveFluxPrompt,
      description: typeof description === "string" ? description : "",
      category: typeof category === "string" ? category : "",
      imageUrl: isMotionPromptReferenceImageUrl(imageUrl) ? imageUrl : "",
      snapshot,
    })

    const startedAt = Date.now()
    const selectedModel = getMayaModelForTask("chat_pro")
    auditPromptRoute({
      routeId: "EP-SHADOW-MOTION-PROMPT",
      mode: "video",
      feature: "video-generation",
      userId: neonUser.id,
      builder: selectedModel,
      prompt: `${MOTION_PROMPT_SYSTEM}\n\n${promptInput}`,
      input: { hasImage: isMotionPromptReferenceImageUrl(imageUrl), category, description },
      startedAt,
    })

    const generatedPrompt = await generateMotionPromptWithVisionFallbacks(
      MOTION_PROMPT_SYSTEM,
      promptInput,
      isMotionPromptReferenceImageUrl(imageUrl) ? imageUrl : undefined,
    )

    const finalPrompt = cleanGeneratedMotionPrompt(generatedPrompt)

    return NextResponse.json({
      motionPrompt: finalPrompt,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error generating motion prompt:", error)
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes(MAYA_LLM_NOT_CONFIGURED)) {
      return NextResponse.json(
        { error: "AI is temporarily unavailable. Please try again in a few minutes." },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Failed to generate motion prompt" }, { status: 500 })
  }
}
