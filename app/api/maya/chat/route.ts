import { streamText, tool, type CoreMessage } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

function createGenerateConceptsTool() {
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
      console.log("[v0] Tool calling generate-concepts API endpoint")

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/maya/generate-concepts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(params),
          },
        )

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`)
        }

        const result = await response.json()
        console.log("[v0] ✅ Concepts generated successfully:", result.concepts?.length)

        return result
      } catch (error) {
        console.error("[v0] Error calling generate-concepts API:", error)
        return {
          state: "error" as const,
          message: "I need a bit more direction! What vibe are you going for?",
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

    const isProduction = host === "sselfie.ai" || host === "www.sselfie.ai"
    const isPreview = host.includes("vercel.app") || host.includes("v0.dev") || host.includes("vusercontent.net")

    console.log("[v0] Environment detection - Host:", host, "Production:", isProduction, "Preview:", isPreview)

    // This matches the pattern used in all other API routes (instagram-tips, enhance-goal, etc.)
    const model = "anthropic/claude-sonnet-4-20250514"

    console.log("[v0] Using AI SDK with model:", model)

    const result = streamText({
      model,
      system: enhancedSystemPrompt,
      messages: allMessages,
      tools: {
        generate_concepts: createGenerateConceptsTool(),
      },
      maxSteps: 5,
      experimental_continueSteps: true,
      temperature: 0.85,
    })

    console.log("[v0] Stream response created successfully")

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Error in Maya chat API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
