import { NextResponse } from "next/server"
import { generateText } from "ai"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getMayaUserSnapshot } from "@/lib/maya/user-snapshot"
import { buildMayaMotionPromptInput, cleanGeneratedMotionPrompt } from "@/lib/maya/video-motion-context"
import { auditPromptRoute } from "@/lib/generation/prompt/route-audit"

const MOTION_PROMPT_SYSTEM = `You are Maya, SSELFIE Studio's brand-safe motion director for Wan 2.5 I2V.

Your job is to write one motion prompt that keeps identity consistency and creates elegant, believable movement.

Rules:
- Focus on natural movement from the existing image composition.
- Keep actions physically plausible and subtle-to-moderate.
- Avoid adding new people, outfits, locations, products, or scene changes.
- Avoid cinematic jargon overload and avoid generic hype language.
- Output exactly one line with no markdown, bullets, headings, or quotes.`

function hasValidImageInput(value: unknown): value is string {
  if (typeof value !== "string") return false
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")
}

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

    const { fluxPrompt, description, category, imageUrl } = await request.json()

    if (!fluxPrompt) {
      return NextResponse.json({ error: "FLUX prompt is required" }, { status: 400 })
    }

    const snapshot = await getMayaUserSnapshot(neonUser.id)
    const promptInput = buildMayaMotionPromptInput({
      fluxPrompt: String(fluxPrompt),
      description: typeof description === "string" ? description : "",
      category: typeof category === "string" ? category : "",
      imageUrl: hasValidImageInput(imageUrl) ? imageUrl : "",
      snapshot,
    })

    const content: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text", text: promptInput },
    ]
    if (hasValidImageInput(imageUrl)) {
      content.push({ type: "image", image: imageUrl })
    }

    const startedAt = Date.now()
    auditPromptRoute({
      routeId: "EP-SHADOW-MOTION-PROMPT",
      mode: "video",
      feature: "video-generation",
      userId: neonUser.id,
      builder: "anthropic/claude-sonnet-4-20250514",
      prompt: `${MOTION_PROMPT_SYSTEM}\n\n${promptInput}`,
      input: { hasImage: hasValidImageInput(imageUrl), category, description },
      startedAt,
    })

    const { text: generatedPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: MOTION_PROMPT_SYSTEM,
      messages: [
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.65,
    })

    const finalPrompt = cleanGeneratedMotionPrompt(generatedPrompt)

    return NextResponse.json({
      motionPrompt: finalPrompt,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error generating motion prompt:", error)
    return NextResponse.json({ error: "Failed to generate motion prompt" }, { status: 500 })
  }
}
