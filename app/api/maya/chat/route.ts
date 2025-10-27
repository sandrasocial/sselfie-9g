import { streamText, tool, generateText, type CoreMessage } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT, type MayaConcept } from "@/lib/maya/personality"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

export const maxDuration = 60 // Increased from 30 to 60 seconds for nested AI calls

const generateConceptsTool = tool({
  description:
    "Generate 3-5 photo concept ideas with detailed fashion and styling intelligence based on Maya's creative lookbook",
  inputSchema: z.object({
    userRequest: z.string().describe("What the user is asking for"),
    aesthetic: z
      .string()
      .optional()
      .describe("Which creative look to base concepts on (e.g., 'Scandinavian Minimalist', 'Urban Moody')"),
    context: z.string().optional().describe("Additional context about the user or their needs"),
    count: z.number().min(3).max(5).default(4).describe("Number of concepts to generate (default 4)"),
  }),
  execute: async function* ({ userRequest, aesthetic, context, count }) {
    console.log("[v0] Tool executing - generating concepts for:", { userRequest, aesthetic, context, count })

    // Yield loading state immediately
    yield {
      state: "loading" as const,
    }

    try {
      const conceptPrompt = `Based on the user's request: "${userRequest}"
${aesthetic ? `Aesthetic preference: ${aesthetic}` : ""}
${context ? `Additional context: ${context}` : ""}

Generate ${count} unique, creative photo concepts. Each concept should include:
1. A catchy, specific title (not generic)
2. Detailed description of the shot
3. Category (Close-Up, Half Body, Full Body, Lifestyle, Action, or Environmental)
4. Fashion intelligence (specific fabrics, colors, silhouettes, accessories)
5. Lighting direction (exact setup and time of day)
6. Location guidance (specific suggestions)
7. Flux prompt (technical prompt for image generation)

Return ONLY a valid JSON array of concepts, no other text. Each concept must have this exact structure:
{
  "title": "string",
  "description": "string",
  "category": "Close-Up" | "Half Body" | "Full Body" | "Lifestyle" | "Action" | "Environmental",
  "fashionIntelligence": "string",
  "lighting": "string",
  "location": "string",
  "prompt": "string starting with: raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic"
}`

      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4",
        prompt: conceptPrompt,
        maxOutputTokens: 2000,
      })

      console.log("[v0] Generated concept text:", text.substring(0, 200))

      // Parse the JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error("No JSON array found in response")
      }

      const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])
      console.log("[v0] Successfully parsed", concepts.length, "concepts")

      // Yield final result
      yield {
        state: "ready" as const,
        concepts: concepts.slice(0, count),
      }
    } catch (error) {
      console.error("[v0] Error generating concepts:", error)

      const fallbackConcepts: MayaConcept[] = [
        {
          title: "The Confident Professional",
          description:
            "A sophisticated close-up portrait that captures your professional essence with refined styling and modern elegance.",
          category: "Close-Up" as const,
          fashionIntelligence:
            "Cream cashmere turtleneck, delicate gold minimal jewelry, natural makeup with defined brows",
          lighting: "Soft directional window light creating gentle shadows, golden hour warmth",
          location: "Modern minimalist office with concrete walls and natural wood elements",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, close-up portrait, wearing cream cashmere turtleneck with delicate gold minimal jewelry, soft directional window light, modern minimalist office, warm professional atmosphere",
        },
        {
          title: "Urban Lifestyle Moment",
          description:
            "A dynamic lifestyle shot capturing you in your element within an urban environment, balancing context with personal style.",
          category: "Lifestyle" as const,
          fashionIntelligence:
            "Tailored charcoal blazer over white silk blouse, minimal silver accessories, structured leather tote",
          lighting: "Natural overcast daylight providing even, flattering illumination",
          location: "Contemporary city street with modern architecture and clean lines",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, half body lifestyle shot, wearing tailored charcoal blazer over white silk blouse, natural overcast daylight, contemporary city street with modern architecture",
        },
        {
          title: "Minimalist Elegance",
          description:
            "A full-body portrait emphasizing silhouette and proportion against a clean backdrop, showcasing complete styling.",
          category: "Full Body" as const,
          fashionIntelligence:
            "Flowing wide-leg trousers in neutral beige, fitted black turtleneck, pointed-toe leather boots",
          lighting: "Studio lighting with key light at 45 degrees, subtle fill light",
          location: "Minimal white studio space with concrete floor",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, full body portrait, wearing flowing wide-leg trousers with fitted black turtleneck, studio lighting, minimal white studio space",
        },
        {
          title: "Natural Light Portrait",
          description:
            "A warm, approachable portrait in beautiful natural light, emphasizing authenticity and connection.",
          category: "Half Body" as const,
          fashionIntelligence: "Soft knit sweater in warm camel tone, layered delicate necklaces, natural wavy hair",
          lighting: "Golden hour sunlight streaming through large windows, warm and diffused",
          location: "Bright, airy interior space with plants and natural textures",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, half body portrait, wearing soft knit sweater in warm camel tone, golden hour sunlight through windows, bright airy interior with plants",
        },
      ]

      yield {
        state: "ready" as const,
        concepts: fallbackConcepts.slice(0, count),
      }
    }
  },
})

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json()

    console.log("[v0] ========== MAYA API REQUEST START ==========")
    console.log("[v0] Maya API Environment:", {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasAIGateway: !!process.env.AI_GATEWAY_URL,
      timestamp: new Date().toISOString(),
      requestUrl: req.url,
    })

    if (!messages || !Array.isArray(messages)) {
      console.error("[v0] Invalid messages array:", messages)
      return new Response("Invalid messages format", { status: 400 })
    }

    const user = await getCurrentNeonUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

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

        if (typeof msg.content === "string") {
          textContent = msg.content
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
      return new Response("No valid messages", { status: 400 })
    }

    const userContext = await getUserContextForMaya(user.stack_auth_id || "")
    const enhancedSystemPrompt = MAYA_SYSTEM_PROMPT + userContext

    const lastMessage = allMessages[allMessages.length - 1]
    const isAskingForConcepts =
      lastMessage?.role === "user" &&
      (lastMessage.content.toLowerCase().includes("photo") ||
        lastMessage.content.toLowerCase().includes("concept") ||
        lastMessage.content.toLowerCase().includes("idea") ||
        lastMessage.content.toLowerCase().includes("suggest") ||
        lastMessage.content.toLowerCase().includes("help"))

    console.log("[v0] User request analysis:", {
      isAskingForConcepts,
      lastMessagePreview: lastMessage?.content?.substring(0, 100),
    })

    console.log("[v0] Streaming with tools:", {
      toolsAvailable: Object.keys({ generateConcepts: generateConceptsTool }),
      model: "anthropic/claude-sonnet-4",
      messageCount: allMessages.length,
      lastMessageRole: allMessages[allMessages.length - 1]?.role,
      lastMessagePreview: allMessages[allMessages.length - 1]?.content?.substring(0, 100),
      toolChoice: isAskingForConcepts ? "required" : "auto",
    })

    const result = streamText({
      model: "anthropic/claude-sonnet-4",
      system: enhancedSystemPrompt,
      messages: allMessages,
      tools: {
        generateConcepts: generateConceptsTool,
      },
      maxOutputTokens: 2000,
      maxSteps: 5,
      toolChoice: isAskingForConcepts ? "required" : "auto",
      onStepFinish: async (step) => {
        console.log("[v0] ========== STEP FINISHED ==========")
        console.log("[v0] Step details:", {
          stepType: step.stepType,
          toolCalls: step.toolCalls?.length || 0,
          toolResults: step.toolResults?.length || 0,
          hasText: !!step.text,
          textLength: step.text?.length || 0,
          finishReason: step.finishReason,
        })

        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log("[v0] ========== TOOL CALLS DETECTED ==========")
          console.log(
            "[v0] Tool calls made:",
            step.toolCalls.map((tc) => ({
              toolName: tc.toolName || "unknown",
              toolCallId: tc.toolCallId || "unknown",
              argsPreview: tc.args ? JSON.stringify(tc.args).substring(0, 200) : "no args",
            })),
          )
        } else {
          console.log("[v0] No tool calls in this step")
        }

        if (step.toolResults && step.toolResults.length > 0) {
          console.log("[v0] ========== TOOL RESULTS ==========")
          console.log(
            "[v0] Tool results:",
            step.toolResults.map((tr) => ({
              toolName: tr.toolName || "unknown",
              toolCallId: tr.toolCallId || "unknown",
              resultPreview: tr.result ? JSON.stringify(tr.result).substring(0, 200) : "no result",
            })),
          )
        }
      },
    })

    console.log("[v0] ========== STREAMING STARTED ==========")
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] ========== MAYA CHAT ERROR ==========")
    console.error("[v0] Maya Chat Error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[v0] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
    })
    return new Response("Internal Server Error", { status: 500 })
  }
}
