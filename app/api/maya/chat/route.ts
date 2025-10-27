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

    // Yield loading state
    yield { state: "loading" as const }

    const conceptPrompt = `As Maya, the world-class AI Art Director, generate ${count} unique photo concepts for this request: "${userRequest}"

${aesthetic ? `Focus on the "${aesthetic}" aesthetic from your creative lookbook.` : ""}
${context ? `Additional context: ${context}` : ""}

CRITICAL REQUIREMENTS:
1. Each concept MUST have a UNIQUE, specific description (never repeat descriptions)
2. Each FLUX prompt MUST be detailed and specific to that exact concept
3. Follow the 80/20 rule: ${Math.ceil(count * 0.8)} portrait/lifestyle shots, ${count - Math.ceil(count * 0.8)} flatlay/environmental shots
4. Include specific fashion intelligence: fabrics, colors, silhouettes, accessories
5. Specify exact lighting setup and time of day
6. Provide specific location suggestions

For each concept, provide:
- title: Catchy, specific title (not generic like "Professional Headshot")
- description: Detailed, unique description of the shot (100-150 words, paint a vivid picture)
- category: One of: Close-Up, Half Body, Full Body, Lifestyle, Action, Environmental
- fashionIntelligence: Specific fabric choices, colors, silhouettes, accessories (be detailed!)
- lighting: Exact lighting setup, time of day, quality of light
- location: Specific location suggestions with context
- prompt: Detailed FLUX prompt that captures ALL the specific details of this concept

FLUX PROMPT STRUCTURE:
Start with: "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic"
Then add: [specific shot type], [detailed subject description], [specific clothing/styling details], [exact lighting description], [specific location details], [mood and atmosphere], [technical quality markers]

Example of a GOOD prompt:
"raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, close-up portrait, woman in her early 30s with confident expression, wearing cream cashmere turtleneck with gold minimal jewelry, soft directional window light from left creating gentle shadows, modern minimalist office with concrete walls and natural wood desk, warm professional atmosphere, shallow depth of field, 85mm lens, high quality, 8k"

Return ONLY a JSON array of concepts, no other text.`

    try {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4",
        prompt: conceptPrompt,
        maxOutputTokens: 3000,
      })

      // Parse the generated concepts
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error("[v0] Failed to extract JSON from AI response:", text)
        throw new Error("Failed to generate concepts")
      }

      const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])
      console.log("[v0] Generated", concepts.length, "unique concepts with detailed prompts")

      // Yield ready state with concepts
      yield {
        state: "ready" as const,
        concepts,
      }
    } catch (error) {
      console.error("[v0] Error generating concepts:", error)
      // Fallback to basic concepts if AI generation fails
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
              "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, close-up portrait, soft natural light, minimal background, high quality, 8k",
          },
        ],
      }
    }
  },
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      console.error("[v0] Invalid messages array:", messages)
      return new Response("Invalid messages format", { status: 400 })
    }

    const user = await getCurrentNeonUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("[v0] Maya chat API called with", messages.length, "messages")

    const coreMessages: CoreMessage[] = messages
      .map((msg: any, index: number) => {
        // Skip messages with invalid structure
        if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
          console.warn(`[v0] Skipping message ${index} with invalid role:`, msg.role)
          return null
        }

        // Extract text content from the message
        let textContent = ""

        if (typeof msg.content === "string") {
          textContent = msg.content
        } else if (Array.isArray(msg.content)) {
          // If content is an array, extract text parts
          textContent = msg.content
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        } else if (msg.parts && Array.isArray(msg.parts)) {
          // If message has parts, extract text from text parts
          textContent = msg.parts
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }

        // Skip messages with no text content
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

    console.log("[v0] Converted to", coreMessages.length, "core messages")

    if (coreMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      return new Response("No valid messages", { status: 400 })
    }

    const userContext = await getUserContextForMaya(user.stack_auth_id || "")
    const enhancedSystemPrompt = MAYA_SYSTEM_PROMPT + userContext

    const result = streamText({
      model: "anthropic/claude-sonnet-4",
      system: enhancedSystemPrompt,
      messages: coreMessages,
      tools: {
        generateConcepts: generateConceptsTool,
      },
      maxOutputTokens: 2000,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Maya Chat Error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return new Response("Internal Server Error", { status: 500 })
  }
}
