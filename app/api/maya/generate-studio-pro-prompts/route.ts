import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { generateText } from "ai"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { generateStudioProPromptsViaAuthority } from "@/lib/maya/prompt-authority"

export async function POST(req: NextRequest) {
  try {
    console.log("[STUDIO-PRO-PROMPTS] Generate Studio Pro prompts API called")

    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get effective user
    const effectiveUser = await getEffectiveNeonUser(authUser.id)
    if (!effectiveUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse request body
    const body = await req.json()
    const {
      userRequest,
      count = 3,
      conversationContext,
      contentType, // e.g., "reel-cover", "ugc-product", "carousel", etc.
    } = body

    console.log("[STUDIO-PRO-PROMPTS] Generating prompts:", {
      userRequest,
      count,
      contentType,
      hasConversationContext: !!conversationContext,
    })

    // Get user context
    const userContext = await getUserContextForMaya(effectiveUser.id)
    
    // Get user gender
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL!)
    const userDataResult = await sql`
      SELECT u.gender
      FROM users u
      WHERE u.id = ${effectiveUser.id}
      LIMIT 1
    `
    const userGender = userDataResult[0]?.gender || "person"

    // Phase 3B P1-3: Generate prompt via Authority Layer
    const authorityResult = await generateStudioProPromptsViaAuthority({
      userRequest,
      count,
      conversationContext,
      contentType,
      userContext,
      userGender,
    })
    const promptGenerationPrompt = authorityResult.systemPrompt

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      prompt: promptGenerationPrompt,
      maxTokens: 4000,
    } as any)

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error("[STUDIO-PRO-PROMPTS] No JSON array found in AI response:", text.substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: "AI response format invalid - no JSON array found",
        },
        { status: 500 }
      )
    }

    // Parse JSON with error handling
    let prompts
    try {
      prompts = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("[STUDIO-PRO-PROMPTS] JSON parse error:", parseError)
      console.error("[STUDIO-PRO-PROMPTS] Attempted to parse:", jsonMatch[0].substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse AI response as JSON",
        },
        { status: 500 }
      )
    }

    // Validate prompts array
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      console.error("[STUDIO-PRO-PROMPTS] Invalid prompts array:", prompts)
      return NextResponse.json(
        {
          success: false,
          error: "No prompts generated - AI returned empty or invalid array",
        },
        { status: 500 }
      )
    }

    // Validate and format prompts
    const formattedPrompts = prompts.map((p: any, idx: number) => ({
      id: `prompt-${Date.now()}-${idx}`,
      title: p.title || `Option ${idx + 1}`,
      description: p.description || "",
      prompt: p.prompt || "",
      category: contentType || "General"
    }))

    // Validate that at least one prompt has content
    const validPrompts = formattedPrompts.filter(p => p.prompt && p.prompt.trim().length > 0)
    if (validPrompts.length === 0) {
      console.error("[STUDIO-PRO-PROMPTS] No valid prompts with content:", formattedPrompts)
      return NextResponse.json(
        {
          success: false,
          error: "All generated prompts are empty",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      state: "ready",
      prompts: validPrompts, // Use validated prompts
    })

  } catch (error) {
    console.error("[STUDIO-PRO-PROMPTS] Error generating prompts:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to generate prompts"
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
