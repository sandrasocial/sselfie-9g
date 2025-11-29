import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { generatePromptV3, type ConceptInput, type UserContext } from "@/lib/maya/v3/prompt-engine-v3"

export const dynamic = "force-dynamic"

/**
 * Maya 3.0 Prompt Generation Test Endpoint
 *
 * This is a testing endpoint that generates optimized FLUX prompts using Maya 3.0 engines.
 * It does NOT:
 * - Write to database
 * - Modify chats
 * - Trigger credit usage
 * - Generate images
 * - Generate concepts
 *
 * It ONLY generates prompt text using Maya 3.0 logic.
 */
export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { conceptText } = body

    if (!conceptText || typeof conceptText !== "string") {
      return NextResponse.json({ error: "conceptText is required" }, { status: 400 })
    }

    // Load user context from Maya's memory system
    const userContextString = await getUserContextForMaya(authUser.id)

    // Build UserContext object for Maya 3.0
    const userContext: UserContext = {
      triggerWord: "ohwx woman", // Default trigger word - would normally come from user's training
      ethnicity: extractEthnicityFromContext(userContextString),
      personalStyles: extractPersonalStylesFromContext(userContextString),
      preferredMoods: [],
      loraWeight: 1.0,
    }

    // Build ConceptInput
    const concept: ConceptInput = {
      text: conceptText,
    }

    // Generate prompt using Maya 3.0
    const result = await generatePromptV3(userContext, concept)

    return NextResponse.json({
      success: true,
      finalPrompt: result.finalPrompt,
      negativePrompt: result.negativePrompt,
      moodBlock: result.moodBlock,
      lightingBlock: result.lightingBlock,
      compositionBlock: result.compositionBlock,
      scenarioBlock: result.scenarioBlock,
      styleBlend: result.styleBlend,
      creativeDirection: result.creativeDirection,
      explanation: result.explanation,
      appliedModules: result.appliedModules,
      raw: result.raw,
    })
  } catch (error) {
    console.error("[v0] Error in Maya 3.0 prompt generation:", error)
    return NextResponse.json(
      {
        error: "Failed to generate prompt",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/**
 * Helper: Extract ethnicity from user context string
 */
function extractEthnicityFromContext(context: string): string | undefined {
  const ethnicityMatch = context.match(/Ethnicity:\s*([^\n]+)/i)
  return ethnicityMatch?.[1]?.trim()
}

/**
 * Helper: Extract personal styles from user context string
 */
function extractPersonalStylesFromContext(context: string): string[] {
  const stylesMatch = context.match(/Visual Aesthetic:\s*([^\n]+)/i)
  if (!stylesMatch) return ["minimalist"]

  const stylesString = stylesMatch[1].trim()
  return stylesString
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}
