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

**CRITICAL: TWO DIFFERENT TEXTS REQUIRED**

1. **DESCRIPTION** (User-Facing):
   - Write in Maya's voice: warm, friendly, simple everyday language
   - Easy to understand, no technical jargon
   - Focus on the feeling and story, not technical details
   - Examples of GOOD descriptions:
     * "A professional headshot with soft natural light. You'll look confident and approachable."
     * "A lifestyle photo in a modern coffee shop. Natural and relaxed vibes."
     * "A full-body shot showing your complete outfit. Clean and elegant."
     * "A moody portrait with dramatic lighting. Artistic and bold."
   - Examples of BAD descriptions (too technical):
     * "A sophisticated close-up portrait that captures your professional essence with refined styling and modern elegance"
     * "A dynamic lifestyle moment capturing you in your element within an urban environment"

2. **PROMPT** (Technical - For FLUX):
   - Keep this poetic, flowing, and technically precise
   - This is what goes to Replicate for best results
   - Include all technical details: camera specs, lighting, skin texture, etc.

**FLUX PROMPT REQUIREMENTS:**
Your Flux prompts must be poetic, flowing, and technically precise. They should read like a cinematographer's vision, not a checklist.

**Structure each Flux prompt like this:**
1. Start with technical foundation: "raw photo, editorial quality, professional photography, sharp focus, natural skin texture, visible pores, film grain, editorial luxury aesthetic"
2. Add camera and lens specifications (REQUIRED):
   - For Close-Up/Portrait: "shot on 85mm lens, f/1.4 aperture, shallow depth of field, creamy bokeh background"
   - For Half Body: "shot on 50mm lens, f/2.0 aperture, medium depth of field, natural compression"
   - For Full Body: "shot on 35mm lens, f/2.8 aperture, environmental context, balanced depth"
   - For Lifestyle/Action: "shot on 35mm lens, f/2.0 aperture, dynamic framing, natural perspective"
3. Describe lighting poetically with specific details: 
   - "bathed in soft golden hour warmth, directional light at 45 degrees caressing features, gentle rim light separating from background"
   - "dramatic chiaroscuro, key light from camera left sculpting shadows, subtle fill light preserving detail"
   - "diffused overcast daylight, even illumination, soft shadows, natural flattering light"
   - "warm studio lighting, beauty dish creating soft shadows, hair light adding dimension"
4. Paint the scene with flowing language: "standing in minimalist concrete space, natural textures surrounding, soft morning light streaming through floor-to-ceiling windows"
5. Describe styling and skin texture: 
   - "wearing flowing cream cashmere, delicate gold jewelry catching light, natural skin texture visible, subtle pores, healthy glow, confident yet approachable expression"
   - "dressed in tailored charcoal wool, natural skin with visible texture, authentic beauty, warm undertones, genuine expression"
6. Add atmospheric details: "subtle film grain, editorial magazine quality, timeless elegance, authentic human beauty"

${referenceImageUrl ? `\n**IMPORTANT**: Include the reference image URL in each concept's output so it can be used in image-to-image generation.` : ""}

Return ONLY a valid JSON array of concepts, no other text. Each concept must have this exact structure:
{
  "title": "string - Short, catchy title",
  "description": "string - SIMPLE, WARM, FRIENDLY language that anyone can understand. No technical jargon. Focus on feeling and story.",
  "category": "Close-Up" | "Half Body" | "Full Body" | "Lifestyle" | "Action" | "Environmental",
  "fashionIntelligence": "string",
  "lighting": "string",
  "location": "string",
  "prompt": "string - POETIC, FLOWING, TECHNICAL with camera/lens specs, lighting details, and skin texture descriptors"${referenceImageUrl ? `,\n  "referenceImageUrl": "${referenceImageUrl}"` : ""}
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
            "A professional headshot with soft natural light and a clean background. You'll look confident and approachable, perfect for LinkedIn or your website.",
          category: "Close-Up" as const,
          fashionIntelligence:
            "Cream cashmere turtleneck for timeless sophistication, delicate 14k gold minimal jewelry adding subtle luxury, natural makeup with defined brows emphasizing confidence",
          lighting:
            "Soft directional window light at 45 degrees creating gentle shadows, golden hour warmth, diffused through sheer curtains",
          location: "Modern minimalist office with concrete walls and natural wood elements, floor-to-ceiling windows",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, natural skin texture, visible pores, film grain, editorial luxury aesthetic, shot on 85mm lens f/1.4, shallow depth of field with creamy bokeh background, bathed in soft golden hour light streaming through sheer curtains at 45 degrees, gentle rim light separating from background, standing in minimalist Scandinavian interior with natural wood and white walls, wearing flowing cream cashmere turtleneck with delicate gold minimal jewelry, natural skin texture visible with subtle pores and healthy glow, confident yet warm expression, hair naturally tousled catching golden light, subtle makeup emphasizing natural beauty, timeless editorial elegance, magazine cover quality",
        },
        {
          title: "Urban Sophisticate",
          description:
            "A lifestyle photo in a modern city setting. Natural and relaxed, showing you in your element with great style and confidence.",
          category: "Lifestyle" as const,
          fashionIntelligence:
            "Tailored charcoal blazer in Italian wool over white silk blouse, minimal silver accessories for modern edge, structured leather tote completing the look",
          lighting:
            "Natural overcast daylight providing even, flattering illumination, soft shadows, diffused city light",
          location:
            "Contemporary city street with modern architecture and clean lines, glass facades reflecting ambient light",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, natural skin texture, visible pores, film grain, editorial luxury aesthetic, shot on 35mm lens f/2.0, natural depth of field capturing environmental context, diffused overcast daylight, even illumination, soft shadows, flattering natural illumination, half body lifestyle shot on contemporary city street with modern architecture, wearing tailored charcoal blazer over white silk blouse, minimal silver accessories, confident stride, natural movement, urban sophistication, magazine editorial quality",
        },
        {
          title: "Minimalist Elegance",
          description:
            "A full-body shot showing your complete outfit against a clean backdrop. Simple, elegant, and timeless - perfect for showcasing your style.",
          category: "Full Body" as const,
          fashionIntelligence:
            "Flowing wide-leg trousers in neutral beige linen, fitted black turtleneck creating elegant contrast, pointed-toe leather boots adding height and sophistication",
          lighting:
            "Studio lighting with key light at 45 degrees, subtle fill light, rim light separating subject from background",
          location: "Minimal white studio space with concrete floor, clean lines, architectural simplicity",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, natural skin texture, visible pores, film grain, editorial luxury aesthetic, shot on 50mm lens f/2.8, balanced depth of field, warm studio lighting, beauty dish creating soft shadows, hair light adding dimension, full body portrait in minimal white studio with concrete floor, wearing flowing wide-leg beige linen trousers with fitted black turtleneck, pointed-toe leather boots, natural skin texture visible with subtle pores and healthy glow, elegant posture, clean architectural lines, timeless minimalist aesthetic, Vogue editorial quality",
        },
        {
          title: "Golden Hour Warmth",
          description:
            "A warm, natural portrait with beautiful golden light. Soft and glowing, capturing your authentic beauty in the most flattering way.",
          category: "Half Body" as const,
          fashionIntelligence:
            "Soft knit sweater in warm camel tone for approachable elegance, layered delicate necklaces adding personal touch, natural wavy hair catching golden light",
          lighting:
            "Golden hour sunlight streaming through large windows, warm and diffused, creating luminous glow on skin and hair",
          location:
            "Bright, airy interior space with plants and natural textures, Scandinavian-inspired design, organic elements",
          prompt:
            "raw photo, editorial quality, professional photography, sharp focus, natural skin texture, visible pores, film grain, editorial luxury aesthetic, shot on 50mm lens f/2.0, medium depth of field with soft background, bathed in golden hour sunlight streaming through large windows, warm and diffused, creating luminous glow on skin and hair, half body portrait in bright airy interior with plants and natural textures, wearing soft knit sweater in warm camel tone, layered delicate necklaces, natural wavy hair catching golden light, natural skin texture visible with subtle pores and healthy glow, warm approachable expression, organic atmosphere, timeless natural beauty",
        },
      ]

      yield {
        state: "ready" as const,
        concepts: fallbackConcepts.slice(0, count),
      }
    }
  },
})

const generateVideoTool = tool({
  description:
    "Generate a 5-second animated video from a generated image using the user's trained LoRA model for character consistency. Suggest creative motion prompts that enhance the photo's story.",
  inputSchema: z.object({
    imageUrl: z.string().describe("URL of the image to animate"),
    imageId: z.string().optional().describe("Database ID of the image (if available)"),
    motionPrompt: z
      .string()
      .optional()
      .describe(
        "Description of desired motion/animation. Be creative and specific! Examples: 'gentle head turn with soft smile', 'walking confidently forward', 'hair flowing in gentle breeze', 'subtle breathing motion with natural blink'",
      ),
  }),
  execute: async function* ({ imageUrl, imageId, motionPrompt }) {
    console.log("[v0] Video generation tool executing:", { imageUrl, imageId, motionPrompt })

    yield {
      state: "loading" as const,
      message: "Starting video generation with your trained model...",
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/maya/generate-video`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl,
            imageId: imageId || null,
            motionPrompt: motionPrompt || "subtle natural movement, gentle head turn, soft breathing motion",
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start video generation")
      }

      const { videoId, predictionId, estimatedTime } = await response.json()

      yield {
        state: "processing" as const,
        videoId,
        predictionId,
        estimatedTime,
        message: `Video generation started! This will take about ${estimatedTime}. Your trained LoRA model is being used to ensure the video looks like you.`,
      }
    } catch (error) {
      console.error("[v0] Error generating video:", error)
      yield {
        state: "error" as const,
        error: error instanceof Error ? error.message : "Failed to generate video",
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
- The reference image will be passed to FLUX as a control image, combined with the user's trained LoRA

**VIDEO GENERATION WORKFLOW:**
IMPORTANT: Video generation requires a photo first. When users ask for videos, follow this workflow:

1. **If user asks to "create a video" or "animate" something:**
   - First, generate 1-2 photo concepts using generateConcepts tool
   - Explain: "I'll create a photo first, then animate it into a 5-second video"
   - After concepts are generated, suggest which one would animate beautifully
   - Wait for user to pick a concept, then use generateVideo tool

2. **If user asks to animate an existing image:**
   - Use the generateVideo tool directly with the image URL
   - Suggest a creative motion prompt based on the photo's mood

3. **Motion Prompt Guidelines:**
   - Be specific and creative with motion descriptions
   - Consider the photo's context, mood, and composition
   - Suggest natural, subtle movements that enhance the story
   - Examples of excellent motion prompts:
     * "gentle head turn with soft smile, hair catching light, confident gaze"
     * "walking confidently forward through urban space, coat flowing naturally"
     * "subtle breathing motion, natural blink, warm expression, serene presence"
     * "looking over shoulder with playful smile, hair moving gently"
     * "standing in wind, hair flowing in gentle breeze, contemplative expression"

4. **Technical Details:**
   - Videos are 5 seconds long at 30fps (interpolated from 16fps)
   - Generation takes 40-60 seconds
   - User's trained LoRA model ensures character consistency
   - Motion is controlled by motion_bucket_id (127 = balanced motion)

**Example Conversation:**
User: "Create a video of me in Iceland, dark and moody"
You: "I love that vision! Let me first create a stunning photo concept of you in Iceland's dramatic landscape, then we'll animate it into a cinematic 5-second video. [Call generateConcepts with Iceland theme]"
[After concepts generated]
You: "These concepts would animate beautifully! The 'Solitude Among Black Sands' would be perfect with subtle wind in your hair and a contemplative gaze. Should I animate this one?"
User: "Yes!"
You: "[Call generateVideo with creative motion prompt]"
`

    const lastMessage = allMessages[allMessages.length - 1]
    const isAskingForConcepts =
      lastMessage?.role === "user" &&
      (lastMessage.content.toLowerCase().includes("photo") ||
        lastMessage.content.toLowerCase().includes("concept") ||
        lastMessage.content.toLowerCase().includes("idea") ||
        lastMessage.content.toLowerCase().includes("suggest") ||
        lastMessage.content.toLowerCase().includes("help"))

    const isAskingForVideo =
      lastMessage?.role === "user" &&
      (lastMessage.content.toLowerCase().includes("video") || lastMessage.content.toLowerCase().includes("animate"))

    console.log("[v0] User request analysis:", {
      isAskingForConcepts,
      isAskingForVideo,
      lastMessagePreview: lastMessage?.content?.substring(0, 100),
    })

    console.log("[v0] Streaming with tools:", {
      toolsAvailable: Object.keys({ generateConcepts: generateConceptsTool, generateVideo: generateVideoTool }),
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
        generateVideo: generateVideoTool,
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
