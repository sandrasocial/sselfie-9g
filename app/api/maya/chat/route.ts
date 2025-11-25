import { streamText, tool, type CoreMessage, generateText } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

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

function getConceptGenerationModel(isPreview: boolean) {
  if (isPreview) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured for preview environment")
    }
    return createOpenAICompatible({
      name: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: "https://api.anthropic.com/v1",
    })("claude-sonnet-4-20250514")
  } else {
    return "anthropic/claude-sonnet-4.5"
  }
}

function createGenerateConceptsTool(isPreview: boolean) {
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
    execute: async ({
      userRequest,
      aesthetic,
      context,
      userModifications,
      count,
      referenceImageUrl,
      customSettings,
      mode = "concept",
    }) => {
      console.log("[v0] Tool executing - generating concepts for:", {
        userRequest,
        aesthetic,
        context,
        userModifications,
        count,
        mode,
      })

      try {
        const supabase = await createServerClient()
        const { user: authUser, error: authError } = await getAuthenticatedUser()

        if (authError || !authUser) {
          throw new Error("Unauthorized")
        }

        const user = await getUserByAuthId(authUser.id)
        if (!user) {
          throw new Error("User not found")
        }

        let userGender = "person"
        const { neon } = await import("@neondatabase/serverless")
        const sql = neon(process.env.DATABASE_URL!)

        const userDataResult = await sql`
        SELECT u.gender, um.trigger_word 
        FROM users u
        LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
        WHERE u.id = ${user.id} 
        LIMIT 1
      `

        console.log("[v0] User data from database:", userDataResult[0])

        if (userDataResult.length > 0 && userDataResult[0].gender) {
          const dbGender = userDataResult[0].gender.toLowerCase().trim()

          if (dbGender === "woman" || dbGender === "female") {
            userGender = "woman"
          } else if (dbGender === "man" || dbGender === "male") {
            userGender = "man"
          } else if (dbGender === "non-binary" || dbGender === "nonbinary" || dbGender === "non binary") {
            userGender = "person"
          } else {
            userGender = dbGender
          }
        }

        const triggerWord = userDataResult[0]?.trigger_word || `user${user.id}`

        console.log("[v0] User data for concept generation:", {
          userGender,
          triggerWord,
          rawGender: userDataResult[0]?.gender,
          mode: mode,
        })

        let imageAnalysis = ""
        if (referenceImageUrl) {
          console.log("[v0] 🔍 Analyzing reference image:", referenceImageUrl)

          const visionAnalysisPrompt = `Look at this image carefully and tell me everything I need to know to recreate this vibe.

Focus on:
1. **The outfit** - What are they wearing? Be super specific (fabrics, fit, colors, style)
2. **The pose** - How are they standing/sitting? What are their hands doing?
3. **The setting** - Where is this? What's the vibe of the location?
4. **The lighting** - What kind of light is this? (warm, cool, bright, moody, etc.)
5. **The mood** - What feeling does this give off? (confident, relaxed, mysterious, playful, etc.)
6. **Color palette** - What colors dominate the image?

Keep it conversational and specific. I need to recreate this exact vibe for Instagram.`

          const visionModel = getConceptGenerationModel(isPreview)

          const { text: visionText } = await generateText({
            model: visionModel,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: visionAnalysisPrompt,
                  },
                  {
                    type: "image",
                    image: referenceImageUrl,
                  },
                ],
              },
            ],
            temperature: 0.7,
          })

          imageAnalysis = visionText
          console.log("[v0] 🎨 Vision analysis complete")
        }

        let photoshootBaseSeed = null
        if (mode === "photoshoot") {
          photoshootBaseSeed = Math.floor(Math.random() * 1000000)
          console.log("[v0] 📸 Photoshoot mode: consistent seed:", photoshootBaseSeed)
        }

        const conceptPrompt = `Create ${count} Instagram photo concepts for ${triggerWord} (${userGender}).

USER REQUEST: "${userRequest}"
${aesthetic ? `VIBE: ${aesthetic}` : ""}
${context ? `CONTEXT: ${context}` : ""}

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

PROMPT REQUIREMENTS (CRITICAL - DO NOT SHORTEN):

Each "prompt" field MUST be 60-90 WORDS. This is NON-NEGOTIABLE.

REQUIRED STRUCTURE FOR EVERY PROMPT:

1. START: "${triggerWord}, ${userGender} in [specific outfit with fabric details]"
2. ACTION: [natural movement or pose], [facial expression]
3. LOCATION: [detailed environment with 3-4 specific elements]
4. LIGHTING: [specific light source, direction, and quality with color temperature]
5. ATMOSPHERE: [weather, time of day, environmental elements like wind/mist/steam]
6. TECHNICAL: "shot on iPhone 15 Pro, [35mm/50mm/85mm] lens, natural skin texture, visible pores, film grain, f/1.8"
7. DETAILS: [texture notes, imperfections, depth of field]

EXAMPLE GOOD PROMPT (82 words - THIS IS YOUR TARGET LENGTH):
"${triggerWord}, ${userGender} in oversized charcoal gray wool turtleneck sweater with cable knit texture and soft camel wide-leg trousers, walking confidently through rain-slicked downtown street at dusk, neon signs reflecting in wet pavement creating vibrant pink and blue light streaks, hair catching cool evening breeze, genuine confident expression, urban energy with blurred traffic lights in background, shot on iPhone 15 Pro, 50mm lens, natural skin texture, visible pores, film grain, f/1.8, shallow depth of field"

DO NOT CREATE SHORT PROMPTS LIKE:
❌ "${triggerWord}, woman in black turtleneck, walking forward, downtown street, neon lighting" (TOO SHORT - 13 words)

YOU MUST CREATE DETAILED PROMPTS LIKE:
✅ "${triggerWord}, woman in fitted black ribbed turtleneck with long sleeves and high-waisted charcoal trousers, striding confidently through downtown street at twilight, vibrant neon signs casting electric blue and hot pink reflections across rain-dampened pavement, cool evening wind catching loose strands of hair, genuine self-assured smile, urban atmosphere with glowing storefronts and soft bokeh from distant headlights visible behind, shot on iPhone 15 Pro, 50mm lens, natural skin texture with visible pores and freckles, film grain, f/1.8, shallow depth creating environmental context" (85 words - PERFECT)

WORD COUNT ENFORCEMENT:
- Minimum: 60 words
- Target: 70-85 words  
- Maximum: 90 words

If your prompt is under 60 words, ADD MORE DETAIL about:
- Fabric textures and clothing fit
- Multiple lighting sources and color temperatures
- Background environmental elements
- Atmospheric conditions
- Natural imperfections (flyaways, clothing creases)
- Specific emotional expressions

JSON FORMAT (return ONLY this, no markdown):
[
  {
    "title": "Concept name (3-5 words)",
    "description": "Brief user-facing description (1 sentence)",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Outfit styling notes",
    "lighting": "Lighting description",
    "location": "Location description",
    "prompt": "YOUR 60-90 WORD DETAILED PROMPT HERE - THIS IS THE MOST IMPORTANT FIELD"
  }
]

Create ${count} concepts now. ENSURE EACH PROMPT IS 60-90 WORDS.`

        console.log("[v0] Generating concepts with model for environment:", isPreview ? "Preview" : "Production")

        const conceptModel = getConceptGenerationModel(isPreview)

        const { text } = await generateText({
          model: conceptModel,
          messages: [
            {
              role: "user",
              content: conceptPrompt,
            },
          ],
          maxTokens: 4096,
          temperature: 0.85,
        })

        console.log("[v0] Generated concept text:", text.substring(0, 200))

        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error("No JSON array found in response")
        }

        const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])

        if (referenceImageUrl) {
          concepts.forEach((concept) => {
            if (!concept.referenceImageUrl) {
              concept.referenceImageUrl = referenceImageUrl
            }
          })
          console.log("[v0] ✅ Reference image URL attached to all concepts for image-to-image generation")
        }

        if (mode === "photoshoot" && photoshootBaseSeed) {
          concepts.forEach((concept, index) => {
            if (!concept.customSettings) {
              concept.customSettings = {}
            }
            concept.customSettings.seed = photoshootBaseSeed + index
            console.log(`[v0] 🎲 Photoshoot Concept ${index + 1} seed:`, concept.customSettings.seed)
          })
        } else {
          concepts.forEach((concept, index) => {
            if (!concept.customSettings) {
              concept.customSettings = {}
            }
            concept.customSettings.seed = Math.floor(Math.random() * 1000000)
            console.log(`[v0] 🎨 Concept ${index + 1} seed (random):`, concept.customSettings.seed)
          })
        }

        if (customSettings) {
          concepts.forEach((concept) => {
            concept.customSettings = {
              ...concept.customSettings,
              ...customSettings,
            }
          })
        }

        console.log("[v0] Successfully parsed", concepts.length, "concepts in", mode, "mode")

        return {
          state: "ready" as const,
          concepts: concepts.slice(0, count),
        }
      } catch (error) {
        console.error("[v0] Error generating concepts:", error)

        return {
          state: "error" as const,
          message:
            "I need a bit more direction! What vibe are you going for? (Like: old money, Y2K, cozy vibes, dark academia, clean girl energy, etc.)",
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

    const headers = req.headers
    const host = headers.get("host") || ""
    const referer = headers.get("referer") || ""
    const origin = headers.get("origin") || ""

    console.log("[v0] Request headers - Host:", host, "Referer:", referer, "Origin:", origin)

    const isPreview =
      host.includes("vusercontent.net") ||
      host.includes("v0-sselfie") ||
      referer.includes("v0.dev") ||
      referer.includes("v0.app") ||
      origin.includes("v0.dev") ||
      origin.includes("v0.app") ||
      process.env.VERCEL_ENV === "preview"

    let model
    if (isPreview) {
      console.log("[v0] Environment: Preview (using Anthropic API directly)")
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY not configured for preview environment")
      }
      model = createOpenAICompatible({
        name: "anthropic",
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: "https://api.anthropic.com/v1",
      })("claude-sonnet-4-20250514")
    } else {
      console.log("[v0] Environment: Production (using AI Gateway)")
      model = "anthropic/claude-sonnet-4.5"
    }

    console.log("[v0] streamText initiated, returning response")

    const result = streamText({
      model: model,
      system: enhancedSystemPrompt,
      messages: allMessages,
      maxSteps: 5,
      tools: {
        generateConcepts: createGenerateConceptsTool(isPreview),
      },
      temperature: 0.85,
      maxTokens: 4096,
      onFinish: async ({ response, finishReason }) => {
        console.log("[v0] streamText completed successfully")
        console.log("[v0] Response text length:", response?.length || 0)
        console.log("[v0] Finish reason:", finishReason)
      },
    })

    console.log("[v0] Stream response created successfully")

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Error in Maya chat API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
