import { streamText, generateText, tool, type CoreMessage } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT, type MayaConcept } from "@/lib/maya/personality"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

export const maxDuration = 30

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
  async *execute({ userRequest, aesthetic, context, count }) {
    console.log("[v0] Maya tool called with:", { userRequest, aesthetic, context, count })

    yield { state: "loading" as const }

    const conceptPrompt = `As Maya, the world-class AI Art Director, generate ${count} unique photo concepts for this request: "${userRequest}"

${aesthetic ? `Focus on the "${aesthetic}" aesthetic from your creative lookbook.` : ""}
${context ? `Additional context: ${context}` : ""}

CRITICAL ETHICAL GUIDELINES:
- NEVER estimate or assume personal features like age, hair color, eye color, or other sensitive attributes
- If age variation is relevant, ASK the user if they want to see themselves as older/younger
- Focus on styling, fashion, lighting, and composition - not on changing the person's inherent features
- Respect the user's natural appearance and only suggest styling enhancements

CRITICAL REQUIREMENTS:
1. Each concept MUST have a UNIQUE, specific description (never repeat descriptions)
2. Each FLUX prompt MUST be detailed and specific to that exact concept
3. Follow the 80/20 rule: ${Math.ceil(count * 0.8)} portrait/lifestyle shots, ${count - Math.ceil(count * 0.8)} flatlay/environmental shots
4. Include specific fashion intelligence: fabrics, colors, silhouettes, accessories
5. Specify exact lighting setup and time of day
6. Provide specific location suggestions
7. DO NOT include quality keywords like "raw photo, editorial quality, professional photography" - let Maya's creative direction speak for itself

For each concept, provide:
- title: Catchy, specific title (not generic like "Professional Headshot")
- description: Detailed, unique description of the shot (100-150 words, paint a vivid picture)
- category: One of: Close-Up, Half Body, Full Body, Lifestyle, Action, Environmental
- fashionIntelligence: Specific fabric choices, colors, silhouettes, accessories (be detailed!)
- lighting: Exact lighting setup, time of day, quality of light
- location: Specific location suggestions with context
- prompt: Detailed FLUX prompt focusing on styling, lighting, location, and mood (NO quality keywords, NO age assumptions)

FLUX PROMPT STRUCTURE:
[specific shot type], [detailed styling and fashion], [exact lighting description], [specific location details], [mood and atmosphere]

Example of a GOOD ethical prompt:
"close-up portrait, wearing cream cashmere turtleneck with delicate gold minimal jewelry, soft directional window light from left creating gentle shadows, modern minimalist office with concrete walls and natural wood desk, warm professional atmosphere, shallow depth of field"

Example of a BAD prompt (contains age assumption and quality keywords):
"raw photo, editorial quality, woman in her early 30s, sharp focus, film grain"

Return ONLY a JSON array of concepts, no other text.`

    try {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4",
        prompt: conceptPrompt,
        maxOutputTokens: 3000,
      })

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error("[v0] Failed to extract JSON from AI response:", text)
        throw new Error("Failed to generate concepts")
      }

      const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])
      console.log("[v0] Generated", concepts.length, "unique concepts with detailed prompts")

      yield {
        state: "ready" as const,
        concepts,
      }
    } catch (error) {
      console.error("[v0] Error generating concepts:", error)
      yield {
        state: "ready" as const,
        concepts: [
          {
            title: "Editorial Portrait",
            description: "A sophisticated portrait capturing your professional essence",
            category: "Close-Up" as const,
            fashionIntelligence: "Neutral tones, quality fabrics",
            lighting: "Soft natural light",
            location: "Clean, minimal background",
            prompt:
              "close-up portrait, wearing neutral tones with quality fabrics, soft natural light, clean minimal background, warm professional atmosphere, shallow depth of field",
          },
        ],
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
      maxSteps: 5, // Allow multiple steps for tool calling
      toolChoice: isAskingForConcepts ? "required" : "auto", // Force tool usage when user asks for concepts
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
              toolName: tc.toolName,
              toolCallId: tc.toolCallId,
              argsPreview: JSON.stringify(tc.args).substring(0, 200),
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
              toolName: tr.toolName,
              toolCallId: tr.toolCallId,
              resultPreview: JSON.stringify(tr.result).substring(0, 200),
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
