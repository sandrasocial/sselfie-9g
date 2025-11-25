import { streamText, tool, type CoreMessage, generateText } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createAnthropic } from "@ai-sdk/anthropic"

export const maxDuration = 60

interface MayaConcept {
  title: string
  description: string
  category: "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait"
  fashionIntelligence: string
  lighting: string
  location: string
  prompt: string
  referenceImageUrl?: string
  customSettings?: {
    styleStrength?: number
    promptAccuracy?: number
    aspectRatio?: string
    seed?: number
  }
}

function getAIModel() {
  const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY

  if (anthropicApiKey) {
    // Always prefer direct Anthropic for tool calls (more reliable in all environments)
    const anthropic = createAnthropic({
      apiKey: anthropicApiKey,
    })
    return anthropic("claude-sonnet-4-20250514")
  } else if (aiGatewayApiKey) {
    // Fallback to AI Gateway
    const anthropic = createAnthropic({
      apiKey: aiGatewayApiKey,
      baseURL: "https://gateway.ai.cloudflare.com/v1/vercel/ai-gateway/anthropic",
    })
    return anthropic("claude-sonnet-4-20250514")
  }

  return null
}

function createGenerateConceptsTool(userId: string, userGender: string, triggerWord: string) {
  return tool({
    description:
      "Generate 3-5 diverse photo concepts with detailed fashion and styling intelligence. Use your comprehensive knowledge of ALL Instagram aesthetics, fashion trends, and photography styles. Match concepts to user's requests, personal brand data, or trending aesthetics. Be dynamic - don't limit yourself to preset templates. If user uploaded a reference image, analyze it visually first.",
    inputSchema: z.object({
      userRequest: z
        .string()
        .describe("What the user is asking for - be specific about aesthetic, style, vibe, or trend they want"),
      aesthetic: z
        .string()
        .optional()
        .describe(
          "Specific aesthetic/trend to focus on (e.g., 'Old Money', 'Coastal Grandmother', 'Y2K', 'Quiet Luxury', 'Dark Academia', 'Clean Girl', etc.) - use ANY Instagram trend, not just preset options",
        ),
      context: z.string().optional().describe("Additional context about the user, occasion, or purpose"),
      userModifications: z
        .string()
        .optional()
        .describe(
          "Specific user-requested modifications like 'make clothes more oversized', 'warmer lighting', 'more realistic skin', 'add specific brand', etc.",
        ),
      count: z.number().optional().default(3).describe("Number of concepts to generate (3-5)"),
      referenceImageUrl: z.string().optional().describe("If user uploaded reference image for inspiration"),
      customSettings: z
        .object({
          styleStrength: z.number().optional(),
          promptAccuracy: z.number().optional(),
          aspectRatio: z.string().optional(),
          seed: z.number().optional(),
        })
        .optional()
        .describe("Optional custom generation settings for style strength, prompt accuracy, etc."),
      mode: z
        .enum(["concept", "photoshoot"])
        .optional()
        .default("concept")
        .describe(
          "'concept' for diverse standalone images (default), 'photoshoot' for consistent carousel with same outfit",
        ),
    }),
    execute: async (params) => {
      console.log("[v0] Generating concepts inline")

      const {
        userRequest,
        aesthetic,
        context,
        userModifications,
        count = 3,
        referenceImageUrl,
        customSettings,
        mode = "concept",
      } = params

      try {
        const model = getAIModel()

        if (!model) {
          console.error("[v0] No AI model available for concept generation")
          return {
            state: "error" as const,
            message: "AI service not configured. Please try again later.",
          }
        }

        // Generate photoshoot seed if needed
        let photoshootBaseSeed = null
        if (mode === "photoshoot") {
          photoshootBaseSeed = Math.floor(Math.random() * 1000000)
          console.log("[v0] Photoshoot mode: consistent seed:", photoshootBaseSeed)
        }

        // Analyze reference image if provided
        let imageAnalysis = ""
        if (referenceImageUrl) {
          console.log("[v0] Analyzing reference image:", referenceImageUrl)

          const visionAnalysisPrompt = `Look at this image carefully and tell me everything I need to know to recreate this vibe.

Focus on:
1. **The outfit** - What are they wearing? Be super specific (fabrics, fit, colors, style)
2. **The pose** - How are they standing/sitting? What are their hands doing?
3. **The setting** - Where is this? What's the vibe of the location?
4. **The lighting** - What kind of light is this? (warm, cool, bright, moody, etc.)
5. **The mood** - What feeling does this give off? (confident, relaxed, mysterious, playful, etc.)
6. **Color palette** - What colors dominate the image?

Keep it conversational and specific. I need to recreate this exact vibe for Instagram.`

          try {
            const { text: visionText } = await generateText({
              model,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: visionAnalysisPrompt },
                    { type: "image", image: referenceImageUrl },
                  ],
                },
              ],
              temperature: 0.7,
            })

            imageAnalysis = visionText
            console.log("[v0] Vision analysis complete")
          } catch (visionError) {
            console.error("[v0] Vision analysis failed:", visionError)
          }
        }

        // Generate concepts
        const conceptPrompt = `Create ${count} Instagram photo concepts for ${triggerWord} (${userGender}).

USER REQUEST: "${userRequest}"
${aesthetic ? `VIBE: ${aesthetic}` : ""}
${context ? `CONTEXT: ${context}` : ""}
${userModifications ? `MODIFICATIONS: ${userModifications}` : ""}

${
  mode === "photoshoot"
    ? `MODE: PHOTOSHOOT - ${count} variations of ONE outfit/location (same outfit, location, just different poses/angles)`
    : `MODE: CONCEPTS - ${count} completely different concepts (different outfits, locations, vibes)`
}

${
  imageAnalysis
    ? `REFERENCE IMAGE ANALYSIS:
${imageAnalysis}

Use this as inspiration for style, lighting, and composition.`
    : ""
}

PROMPT LENGTH INTELLIGENCE:
- Close-ups: 20-30 words (tight focus, face preservation priority)
- Half body: 25-35 words (optimal sweet spot)
- Full body: 30-40 words (more scene detail)
- Environmental: 35-45 words (wider context)

Keep prompts CONCISE for optimal facial accuracy. Trigger word prominence is critical.

JSON FORMAT (return ONLY this, no markdown):
[
  {
    "title": "Concept name (3-5 words)",
    "description": "Brief user-facing description (1 sentence)",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Outfit styling notes",
    "lighting": "Lighting description",
    "location": "Location description",
    "prompt": "YOUR INTELLIGENT-LENGTH PROMPT - optimized for category (see guidelines above)"
  }
]

Create ${count} concepts now. Use intelligent prompt lengths based on category for best results.`

        console.log("[v0] Generating concepts with model...")

        const { text } = await generateText({
          model,
          messages: [
            {
              role: "user",
              content: conceptPrompt,
            },
          ],
          maxTokens: 4096,
          temperature: 0.85,
        })

        console.log("[v0] Generated concept text (first 200 chars):", text.substring(0, 200))

        // Parse JSON response
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error("No JSON array found in response")
        }

        const concepts = JSON.parse(jsonMatch[0])

        // Add reference image URL if provided
        if (referenceImageUrl) {
          concepts.forEach((concept: any) => {
            if (!concept.referenceImageUrl) {
              concept.referenceImageUrl = referenceImageUrl
            }
          })
          console.log("[v0] Reference image URL attached to all concepts")
        }

        // Add seeds
        if (mode === "photoshoot" && photoshootBaseSeed) {
          concepts.forEach((concept: any, index: number) => {
            if (!concept.customSettings) {
              concept.customSettings = {}
            }
            concept.customSettings.seed = photoshootBaseSeed + index
          })
        } else {
          concepts.forEach((concept: any) => {
            if (!concept.customSettings) {
              concept.customSettings = {}
            }
            concept.customSettings.seed = Math.floor(Math.random() * 1000000)
          })
        }

        // Apply custom settings
        if (customSettings) {
          concepts.forEach((concept: any) => {
            concept.customSettings = {
              ...concept.customSettings,
              ...customSettings,
            }
          })
        }

        console.log("[v0] Successfully generated", concepts.length, "concepts")

        return {
          state: "ready" as const,
          concepts: concepts.slice(0, count),
        }
      } catch (error) {
        console.error("[v0] Error generating concepts:", error)
        return {
          state: "error" as const,
          message:
            "I had trouble creating those concepts. Let me try a different approach - what specific vibe are you going for?",
        }
      }
    },
  })
}

export async function POST(req: NextRequest) {
  console.log("[v0] Maya chat API called")

  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const userId = authUser.id
    const user = await getUserByAuthId(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUserId = user.id

    console.log("[v0] User authenticated:", { userId, dbUserId })

    const { messages, chatId } = await req.json()

    const supabase = await createServerClient()

    console.log("[v0] Maya chat API called with", messages.length, "messages, chatId:", chatId)
    console.log("[v0] User:", user.email, "ID:", user.id)

    let userGender = "person"
    let triggerWord = `user${user.id}`

    try {
      const { neon } = await import("@neondatabase/serverless")
      if (process.env.DATABASE_URL) {
        const sql = neon(process.env.DATABASE_URL)
        const userDataResult = await sql`
          SELECT u.gender, um.trigger_word 
          FROM users u
          LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
          WHERE u.id = ${user.id} 
          LIMIT 1
        `

        if (userDataResult.length > 0) {
          if (userDataResult[0].gender) {
            const dbGender = userDataResult[0].gender.toLowerCase().trim()
            if (dbGender === "woman" || dbGender === "female") {
              userGender = "woman"
            } else if (dbGender === "man" || dbGender === "male") {
              userGender = "man"
            } else {
              userGender = dbGender || "person"
            }
          }
          if (userDataResult[0].trigger_word) {
            triggerWord = userDataResult[0].trigger_word
          }
        }
        console.log("[v0] User context for concepts:", { userGender, triggerWord })
      }
    } catch (dbError) {
      console.warn("[v0] Could not fetch user context:", dbError)
    }

    let chatHistory: CoreMessage[] = []
    if (chatId) {
      try {
        const { getChatMessages } = await import("@/lib/data/maya")
        const dbMessages = await getChatMessages(chatId)

        console.log("[v0] Loaded", dbMessages.length, "messages from database for chat", chatId)

        chatHistory = dbMessages
          .map((msg) => {
            if (!msg.content || msg.content.trim() === "") {
              return null
            }
            return {
              role: msg.role as "user" | "assistant",
              content: msg.content,
            } as CoreMessage
          })
          .filter((msg): msg is CoreMessage => msg !== null)

        console.log("[v0] Converted", chatHistory.length, "database messages to core messages")
      } catch (error) {
        console.error("[v0] Error loading chat history:", error)
      }
    }

    const coreMessages: CoreMessage[] = messages
      .map((msg: any, index: number) => {
        if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
          console.warn(`[v0] Skipping message ${index} with invalid role:`, msg.role)
          return null
        }

        let textContent = ""
        let inspirationImageUrl: string | null = null

        if (typeof msg.content === "string") {
          textContent = msg.content
          const imageMatch = textContent.match(/\[(Inspiration Image|Reference Image): (https?:\/\/[^\]]+)\]/)
          if (imageMatch) {
            inspirationImageUrl = imageMatch[2]
            textContent = textContent.replace(imageMatch[0], "").trim()
            console.log("[v0] Extracted inspiration image:", inspirationImageUrl)
          }
        } else if (Array.isArray(msg.content)) {
          textContent = msg.content
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        } else if (msg.parts && Array.isArray(msg.parts)) {
          textContent = msg.parts
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }

        if (!textContent || textContent.trim() === "") {
          console.warn(`[v0] Skipping message ${index} with empty content`)
          return null
        }

        if (inspirationImageUrl) {
          console.log("[v0] 🎨 Creating vision message with image URL:", inspirationImageUrl)
          return {
            role: msg.role,
            content: [
              {
                type: "image" as const,
                image: inspirationImageUrl,
              },
              {
                type: "text" as const,
                text: textContent,
              },
            ],
          } as CoreMessage
        }

        return {
          role: msg.role,
          content: textContent,
        } as CoreMessage
      })
      .filter((msg): msg is CoreMessage => msg !== null)

    console.log("[v0] Converted to", coreMessages.length, "core messages from current request")

    const allMessages: CoreMessage[] = [...chatHistory]

    for (const msg of coreMessages) {
      const isDuplicate = chatHistory.some(
        (historyMsg) => historyMsg.role === msg.role && historyMsg.content === msg.content,
      )
      if (!isDuplicate) {
        allMessages.push(msg)
      }
    }

    console.log(
      "[v0] Total messages for AI context:",
      allMessages.length,
      "(",
      chatHistory.length,
      "from history +",
      allMessages.length - chatHistory.length,
      "new)",
    )

    if (allMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      throw new Error("No valid messages")
    }

    let authId = user.stack_auth_id || user.supabase_user_id

    if (!authId) {
      console.log("[v0] No auth ID found, using Neon user ID as fallback")
      authId = user.id
    }

    const userContext = await getUserContextForMaya(authId)

    const enhancedSystemPrompt =
      MAYA_SYSTEM_PROMPT +
      `\n\n` +
      userContext +
      `\n\nRemember: Match their communication style naturally and keep prompts concise for best results.`

    console.log("[v0] Enhanced system prompt length:", enhancedSystemPrompt.length, "characters")
    console.log("[v0] Calling streamText with", allMessages.length, "messages")

    const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY

    let model: any
    let useWebSearch = true

    if (aiGatewayApiKey) {
      console.log("[v0] Using AI Gateway with model: anthropic/claude-sonnet-4-20250514")
      model = "anthropic/claude-sonnet-4-20250514"
    } else if (anthropicApiKey) {
      console.log("[v0] AI Gateway not available, using direct Anthropic API")
      const { anthropic } = await import("@ai-sdk/anthropic")
      model = anthropic("claude-sonnet-4-20250514")
      useWebSearch = false
    } else {
      console.error("[v0] No AI provider configured")
      return NextResponse.json(
        {
          error: "AI service configuration error. Please contact support.",
          details: "Neither AI_GATEWAY_API_KEY nor ANTHROPIC_API_KEY is configured",
        },
        { status: 500 },
      )
    }

    const result = streamText({
      model,
      ...(typeof model === "string" && aiGatewayApiKey ? { apiKey: aiGatewayApiKey } : {}),
      system: enhancedSystemPrompt,
      messages: allMessages,
      tools: {
        generate_concepts: createGenerateConceptsTool(user.id, userGender, triggerWord),
      },
      maxSteps: 5,
      experimental_continueSteps: true,
      temperature: 0.85,
      ...(useWebSearch
        ? {
            experimental_generateText: {
              search: {
                enabled: true,
              },
            },
          }
        : {}),
    })

    console.log("[v0] Stream response created successfully", useWebSearch ? "with web search enabled" : "")

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Error in Maya chat API:", error)

    if (
      error instanceof Error &&
      (error.message.includes("Gateway") || error.message.includes("OIDC")) &&
      process.env.ANTHROPIC_API_KEY
    ) {
      console.log("[v0] AI Gateway failed with OIDC error, retrying with direct Anthropic API...")

      try {
        const { anthropic } = await import("@ai-sdk/anthropic")
        const model = anthropic("claude-sonnet-4-20250514")

        console.log("[v0] Successfully using direct Anthropic API as fallback")
        return NextResponse.json({ error: "Please try again" }, { status: 503 })
      } catch (retryError) {
        console.error("[v0] Direct Anthropic API also failed:", retryError)
      }
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
