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
    referenceImageUrl: z.string().optional().describe("URL of reference image uploaded by user"),
  }),
  execute: async function* ({ userRequest, aesthetic, context, count, referenceImageUrl }) {
    console.log("[v0] Tool executing - generating concepts for:", {
      userRequest,
      aesthetic,
      context,
      count,
      referenceImageUrl,
    })

    // Yield loading state immediately
    yield {
      state: "loading" as const,
    }

    try {
      const conceptPrompt = `Based on the user's request: "${userRequest}"
${aesthetic ? `Aesthetic preference: ${aesthetic}` : ""}
${context ? `Additional context: ${context}` : ""}
${referenceImageUrl ? `**REFERENCE IMAGE PROVIDED**: ${referenceImageUrl}\n\n**IMPORTANT**: The user has uploaded a reference image. This will be combined with their trained personal model to create images of THEM with/using this product or in this style.\n\n**How to use the reference image:**\n- For PRODUCTS (skincare, accessories, etc.): Generate concepts showing the user holding, using, or styled with the product\n- For STYLE REFERENCES: Create variations inspired by the composition, lighting, or mood\n- For FLATLAYS: Position the product as the hero with the user's hands/body partially visible\n- The reference image will be used as a control image in FLUX, guiding the composition while the user's trained LoRA ensures their likeness appears in the final image` : ""}

Generate ${count} unique, creative photo concepts. Each concept should be a work of art.

**CRITICAL REQUIREMENTS FOR FLUX PROMPTS:**
Your Flux prompts must be poetic, flowing, and technically precise. They should read like a cinematographer's vision, not a checklist.

**Structure each Flux prompt like this:**
1. Start with technical foundation: "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic"
2. Add camera and lens specifications (REQUIRED):
   - For Close-Up/Portrait: "shot on 85mm lens, f/1.4 aperture, shallow depth of field, creamy bokeh background"
   - For Half Body: "shot on 50mm lens, f/2.0 aperture, medium depth of field, natural compression"
   - For Full Body: "shot on 35mm lens, f/2.8 aperture, environmental context, balanced depth"
   - For Lifestyle/Action: "shot on 35mm lens, f/2.0 aperture, dynamic framing, natural perspective"
3. Describe lighting poetically: "bathed in golden hour warmth, soft directional light caressing features" or "dramatic chiaroscuro, key light sculpting shadows"
4. Paint the scene with flowing language: "standing in minimalist concrete space, natural textures surrounding, soft morning light streaming through floor-to-ceiling windows"
5. Describe styling and mood: "wearing flowing cream cashmere, delicate gold jewelry catching light, confident yet approachable expression"
6. Add atmospheric details: "subtle film grain, editorial magazine quality, timeless elegance"

**Example of a GOOD Flux prompt:**
"raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, shot on 85mm lens f/1.4, shallow depth of field with creamy bokeh, bathed in soft golden hour light streaming through sheer curtains, standing in minimalist Scandinavian interior with natural wood and white walls, wearing flowing cream cashmere turtleneck with delicate layered gold necklaces, confident yet warm expression, hair naturally tousled, subtle makeup emphasizing natural beauty, timeless editorial elegance, magazine cover quality"

**Example of a BAD Flux prompt (too mechanical):**
"raw photo, professional photography, 85mm lens, good lighting, wearing sweater, indoor setting"

${referenceImageUrl ? `\n**IMPORTANT**: Include the reference image URL in each concept's output so it can be used in image-to-image generation.` : ""}

Return ONLY a valid JSON array of concepts, no other text. Each concept must have this exact structure:
{
  "title": "string",
  "description": "string",
  "category": "Close-Up" | "Half Body" | "Full Body" | "Lifestyle" | "Action" | "Environmental",
  "fashionIntelligence": "string",
  "lighting": "string",
  "location": "string",
  "prompt": "string - poetic, flowing, with camera/lens specs"${referenceImageUrl ? `,\n  "referenceImageUrl": "${referenceImageUrl}"` : ""}
}`

      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4",
        prompt: conceptPrompt,
        maxOutputTokens: 3000,
      })

      console.log("[v0] Generated concept text:", text.substring(0, 200))

      // Parse the JSON response
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
      }

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
          title: "The Confident Executive",
          description:
            "A sophisticated close-up portrait that captures your professional essence with refined styling and modern elegance, bathed in soft natural light.",
          category: "Close-Up" as const,
          fashionIntelligence:
            "Cream cashmere turtleneck for timeless sophistication, delicate 14k gold minimal jewelry adding subtle luxury, natural makeup with defined brows emphasizing confidence",
          lighting:
            "Soft directional window light at 45 degrees creating gentle shadows, golden hour warmth, diffused through sheer curtains",
          location: "Modern minimalist office with concrete walls and natural wood elements, floor-to-ceiling windows",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, shot on 85mm lens f/1.4, shallow depth of field with creamy bokeh background, bathed in soft golden hour light streaming through sheer curtains, close-up portrait in modern minimalist office with concrete walls, wearing cream cashmere turtleneck with delicate gold minimal jewelry, confident yet approachable expression, natural makeup with defined brows, warm professional atmosphere, timeless editorial elegance",
        },
        {
          title: "Urban Sophisticate",
          description:
            "A dynamic lifestyle moment capturing you in your element within an urban environment, balancing architectural context with personal style and movement.",
          category: "Lifestyle" as const,
          fashionIntelligence:
            "Tailored charcoal blazer in Italian wool over white silk blouse, minimal silver accessories for modern edge, structured leather tote completing the look",
          lighting:
            "Natural overcast daylight providing even, flattering illumination, soft shadows, diffused city light",
          location:
            "Contemporary city street with modern architecture and clean lines, glass facades reflecting ambient light",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, shot on 35mm lens f/2.0, natural depth of field capturing environmental context, soft overcast daylight creating even illumination, half body lifestyle shot on contemporary city street with modern architecture, wearing tailored charcoal blazer over white silk blouse, minimal silver accessories, confident stride, natural movement, urban sophistication, magazine editorial quality",
        },
        {
          title: "Minimalist Elegance",
          description:
            "A full-body portrait emphasizing silhouette and proportion against a clean backdrop, showcasing complete styling with architectural precision.",
          category: "Full Body" as const,
          fashionIntelligence:
            "Flowing wide-leg trousers in neutral beige linen, fitted black turtleneck creating elegant contrast, pointed-toe leather boots adding height and sophistication",
          lighting:
            "Studio lighting with key light at 45 degrees, subtle fill light, rim light separating subject from background",
          location: "Minimal white studio space with concrete floor, clean lines, architectural simplicity",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, shot on 50mm lens f/2.8, balanced depth of field, professional studio lighting with key light at 45 degrees and subtle fill, full body portrait in minimal white studio with concrete floor, wearing flowing wide-leg beige linen trousers with fitted black turtleneck, pointed-toe leather boots, elegant posture, clean architectural lines, timeless minimalist aesthetic, Vogue editorial quality",
        },
        {
          title: "Golden Hour Warmth",
          description:
            "A warm, approachable portrait bathed in beautiful natural light, emphasizing authenticity and connection through soft, glowing illumination.",
          category: "Half Body" as const,
          fashionIntelligence:
            "Soft knit sweater in warm camel tone for approachable elegance, layered delicate necklaces adding personal touch, natural wavy hair catching golden light",
          lighting:
            "Golden hour sunlight streaming through large windows, warm and diffused, creating luminous glow on skin and hair",
          location:
            "Bright, airy interior space with plants and natural textures, Scandinavian-inspired design, organic elements",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, film grain, visible skin pores, editorial luxury aesthetic, shot on 50mm lens f/2.0, medium depth of field with soft background, bathed in golden hour sunlight streaming through large windows, half body portrait in bright airy interior with plants and natural textures, wearing soft knit sweater in warm camel tone, layered delicate necklaces, natural wavy hair catching golden light, warm approachable expression, organic atmosphere, timeless natural beauty",
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
    const user = await getCurrentNeonUser()

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
        let referenceImageUrl: string | null = null

        if (typeof msg.content === "string") {
          textContent = msg.content
          const imageMatch = textContent.match(/\[Reference Image: (https?:\/\/[^\]]+)\]/)
          if (imageMatch) {
            referenceImageUrl = imageMatch[1]
            textContent = textContent.replace(imageMatch[0], "").trim()
            console.log("[v0] Extracted reference image:", referenceImageUrl)
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

        if (referenceImageUrl) {
          textContent = `[User has uploaded a reference image: ${referenceImageUrl}]\n\n${textContent}`
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
    const enhancedSystemPrompt =
      MAYA_SYSTEM_PROMPT +
      userContext +
      `

**IMAGE-TO-IMAGE GENERATION:**
When users upload a reference image (you'll see [User has uploaded a reference image: URL] in their message):
- Analyze the image for composition, lighting, styling, and mood
- Generate concepts that use this image as inspiration or incorporate the product/subject
- For product flatlays: suggest styled compositions with the product as the hero
- For reference photos: create variations with different angles, lighting, or styling
- Always acknowledge the reference image and explain how you're using it in your concepts
- Include the reference image URL in the Flux prompts using the format: "reference_image: URL"
`

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
