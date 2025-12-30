import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { MAYA_PRO_SYSTEM_PROMPT } from "@/lib/maya/pro-personality"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { checkCredits, deductCredits } from "@/lib/credits"
import { detectCategory } from "@/lib/maya/pro/category-system"
import type { ImageLibrary } from "@/lib/maya/pro/category-system"

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const maxDuration = 60

/**
 * Pro Mode Chat API Route
 * 
 * Handles chat interactions for Studio Pro Mode.
 * Uses Pro Mode personality, checks credits, and handles concept generation triggers.
 */
export async function POST(req: NextRequest) {
  console.log("[v0] [PRO MODE] Maya Pro chat API called")

  try {
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] [PRO MODE] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const userId = authUser.id
    const user = await getEffectiveNeonUser(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUserId = user.id

    console.log("[v0] [PRO MODE] User authenticated:", { userId, dbUserId })

    // Check credits (1 credit per chat message)
    const hasCredits = await checkCredits(dbUserId, 1)
    if (!hasCredits) {
      console.log("[v0] [PRO MODE] User has insufficient credits for Maya Pro chat")
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    // Parse request body
    const body = await req.json()
    const { message, imageUrl, imageLibrary, chatHistory } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    console.log("[v0] [PRO MODE] Request:", {
      messageLength: message.length,
      hasImageUrl: !!imageUrl,
      hasImageLibrary: !!imageLibrary,
      chatHistoryLength: chatHistory?.length || 0,
    })

    // Build image library context
    const library: ImageLibrary = imageLibrary || {
      selfies: [],
      products: [],
      people: [],
      vibes: [],
      intent: "",
    }

    // Detect category from user request and image library
    // 🔴 FIX: Category can be null - handle gracefully
    const categoryInfo = detectCategory(message, library)
    
    // Build category context for system prompt (only if category detected)
    const categoryContext = categoryInfo ? `
## User's Current Category: ${categoryInfo.name}
- Description: ${categoryInfo.description}
- Associated Brands: ${categoryInfo.brands.join(", ") || "None"}
- Available Templates: ${categoryInfo.templates}
` : `
## Category: Not Specified
- Maya will use her full fashion knowledge and expertise to create dynamic prompts based on your request
- No category restrictions - full creative freedom
`

    const libraryContext = `
## User's Image Library:
- Selfies: ${library.selfies.length} image(s)
- Products: ${library.products.length} image(s)
- People: ${library.people.length} image(s)
- Vibes: ${library.vibes.length} image(s)
- Current Intent: ${library.intent || "Not specified"}
`
    
    console.log("[v0] [PRO MODE] Category detection:", categoryInfo ? categoryInfo.name : "None (using dynamic generation)")

    // Get user context (memory, brand, etc.)
    const userContext = await getUserContextForMaya(userId)

    // Build Pro Mode system prompt with context
    const systemPrompt = `${MAYA_PRO_SYSTEM_PROMPT}

${userContext}

${categoryContext}
${libraryContext}

## CRITICAL: Studio Pro Mode Rules
- You are in Studio Pro Mode - use your Pro personality
- The user has an image library with ${library.selfies.length + library.products.length + library.people.length + library.vibes.length} total images
- Always use [GENERATE_CONCEPTS] trigger when user requests content creation
${categoryInfo ? `- Reference the user's category (${categoryInfo.name}) and brand associations when relevant` : '- Use your full fashion knowledge and expertise to create dynamic prompts based on the user\'s request'}
- Be specific and use real brand names when appropriate
- When category is not specified, use your complete fashion intelligence to generate creative, dynamic prompts
`

    // Build conversation history
    const conversationHistory: UIMessage[] = []

    // Add chat history if provided
    if (Array.isArray(chatHistory)) {
      chatHistory.forEach((msg: any) => {
        if (msg.role && msg.content) {
          conversationHistory.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
            ...(msg.imageUrl && {
              parts: [
                { type: "text", text: msg.content },
                { type: "image", image: msg.imageUrl },
              ],
            }),
          })
        }
      })
    }

    // Add current user message
    const currentMessage: UIMessage = {
      role: "user",
      content: imageUrl
        ? [
            { type: "text", text: message },
            { type: "image", image: imageUrl },
          ]
        : message,
    }

    conversationHistory.push(currentMessage)

    // Convert to model messages
    const modelMessages = convertToModelMessages(conversationHistory)

    console.log("[v0] [PRO MODE] Streaming response with", modelMessages.length, "messages")

    // Stream response using AI SDK
    const result = streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Deduct credits after successful response start
    try {
      await deductCredits(dbUserId, 1, "maya_pro_chat", "Maya Pro chat message")
      console.log("[v0] [PRO MODE] Credits deducted successfully")
    } catch (creditError) {
      console.error("[v0] [PRO MODE] Error deducting credits:", creditError)
      // Don't fail the request if credit deduction fails - log it
    }

    // Return streaming response
    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error("[v0] [PRO MODE] Chat API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
