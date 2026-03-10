import { streamText, convertToModelMessages } from "ai"
import { getMayaSystemPrompt, MAYA_PRO_CONFIG } from "@/lib/maya/mode-adapters"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { checkCredits, deductCredits } from "@/lib/credits"
import { detectCategory } from "@/lib/maya/pro/category-system"
import type { ImageLibrary } from "@/lib/maya/pro/category-system"
import { getProductGenerationPrompt } from "@/lib/products-system-prompt"
import { createMayaOpenRouterModel, getMayaModelForTask } from "@/lib/maya/openrouter"

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const maxDuration = 60

/**
 * Specialized Maya Pro chat route.
 *
 * This file is not the primary live Maya chat backend for the current app
 * shell. The active Maya UI (`useMayaChat`) posts to `/api/maya/chat` and
 * switches behavior with headers such as `x-studio-pro-mode`,
 * `x-chat-type`, and `x-active-tab`.
 *
 * Keep this route for older/manual Pro-only callers and narrow integrations
 * until the chat surface is fully consolidated.
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

    // Get product context from body or request headers (passed from frontend via useMayaChat)
    const headerProduct = req.headers.get("x-academy-product")
    const headerFirstTime = req.headers.get("x-first-time-product-user") === "true"
    const { product: bodyProduct, firstTimeProductUser: bodyFirstTime } = body
    const product = bodyProduct || headerProduct
    const firstTimeProductUser = bodyFirstTime !== undefined ? bodyFirstTime : headerFirstTime
    const isFirstMessage = !chatHistory || chatHistory.length === 0

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

    // Check for product generation (mini-product AI delivery)
    let productGenerationPrompt = ""
    if (product && firstTimeProductUser && isFirstMessage) {
      productGenerationPrompt = getProductGenerationPrompt(product, { brand_profile: userContext })
      console.log(`[PRODUCT] Activated ${product} generation prompt for first-time user`)
    }

    // Build Pro Mode system prompt with context using unified system
    const systemPrompt = `${getMayaSystemPrompt(MAYA_PRO_CONFIG)}

${userContext}
${libraryContext}
${categoryContext}
${productGenerationPrompt ? `\n## Product Delivery Mode\n${productGenerationPrompt}` : ""}

## CRITICAL: Studio Pro Mode Rules
- You are in Studio Pro Mode - use your Pro personality
- The user has an image library with ${library.selfies.length + library.products.length + library.people.length + library.vibes.length} total images
- Always use [GENERATE_CONCEPTS] trigger when user requests content creation
${categoryInfo ? `- Reference the user's category (${categoryInfo.name}) and brand associations when relevant` : '- Use your full fashion knowledge and expertise to create dynamic prompts based on the user\'s request'}
- Be specific and use real brand names when appropriate
- When category is not specified, use your complete fashion intelligence to generate creative, dynamic prompts
`

    // Build conversation history
    const conversationHistory: any[] = []

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
    const currentMessage: any = {
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
    const modelMessages = await convertToModelMessages(conversationHistory as any)

    console.log("[v0] [PRO MODE] Streaming response with", modelMessages.length, "messages")
    const selectedModel = getMayaModelForTask("chat_pro")
    console.log("[v0] [PRO MODE] Model route:", selectedModel)

    // Stream response using AI SDK
    const result = streamText({
      model: createMayaOpenRouterModel("chat_pro"),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.7,
      maxTokens: 2000,
    } as any)

    // Deduct credits after successful response start
    try {
      await deductCredits(dbUserId, 1, "image", "Maya Pro chat message")
      console.log("[v0] [PRO MODE] Credits deducted successfully")
    } catch (creditError) {
      console.error("[v0] [PRO MODE] Error deducting credits:", creditError)
      // Don't fail the request if credit deduction fails - log it
    }

    // Return streaming response
    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error("[v0] [PRO MODE] Chat API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
