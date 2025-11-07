import { streamText, tool, type CoreMessage, generateText } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export const maxDuration = 60

interface MayaConcept {
  title: string
  description: string
  category: "Close-Up" | "Half Body" | "Lifestyle" | "Action" | "Environmental"
  fashionIntelligence: string
  lighting: string
  location: string
  prompt: string
  referenceImageUrl?: string
  customSettings?: {
    styleStrength?: number
    promptAccuracy?: number
    aspectRatio?: string
  }
}

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
    customSettings: z
      .object({
        styleStrength: z.number().optional(),
        promptAccuracy: z.number().optional(),
        aspectRatio: z.string().optional(),
      })
      .optional()
      .describe("User's custom generation settings including aspect ratio"),
  }),
  execute: async function* ({ userRequest, aesthetic, context, count, referenceImageUrl, customSettings }) {
    console.log("[v0] Tool executing - generating concepts for:", {
      userRequest,
      aesthetic,
      context,
      count,
      referenceImageUrl,
      customSettings,
    })

    yield {
      state: "loading" as const,
    }

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
        SELECT gender FROM users WHERE id = ${user.id} LIMIT 1
      `
      if (userDataResult.length > 0 && userDataResult[0].gender) {
        userGender = userDataResult[0].gender
      }

      console.log("[v0] User gender for concept generation:", userGender)

      const conceptPrompt = `You are Maya, SELFIE Studio's world-class AI Art Director. Your prompts are POETIC, EVOCATIVE, and FASHION-FORWARD.

**YOUR CREATIVE DNA:**
- You write flowing, lyrical descriptions that read like fashion editorials
- Every detail tells a story about style, mood, and atmosphere
- You never use technical photography jargon in a boring list - you integrate it naturally
- You describe PEOPLE first, STYLING second, SETTING third, TECHNICAL fourth
- You make every concept feel like it belongs in Vogue or Harper's Bazaar

**USER REQUEST:** "${userRequest}"
${aesthetic ? `**AESTHETIC PREFERENCE:** ${aesthetic}` : ""}
${context ? `**ADDITIONAL CONTEXT:** ${context}` : ""}
${
  referenceImageUrl
    ? `
**🎨 INSPIRATION IMAGE PROVIDED: ${referenceImageUrl}**

**CRITICAL: YOU ARE IN STYLE REPLICATION MODE**

The user has uploaded an inspiration image. Your PRIMARY job is to ANALYZE and REPLICATE its exact aesthetic.

**MANDATORY ANALYSIS - BE EXTREMELY SPECIFIC:**

1. **LIGHTING** (Most Critical):
   - Light source: (window, studio, golden hour, single dramatic source, overhead, etc.)
   - Light quality: (soft/diffused, harsh/direct, moody/low-key, bright/high-key)
   - Light direction: (front, side 45°, back, top, bottom, Rembrandt)
   - Color temperature: (warm golden, cool blue, neutral, mixed warm/cool)
   - Shadow depth: (deep dramatic, soft subtle, no shadows, high contrast)

2. **COLOR PALETTE**:
   - Dominant colors: (be specific: "deep burgundy" not "red", "warm beige" not "tan")
   - Temperature: (warm/golden, cool/blue, neutral/grey, monochrome)
   - Contrast level & saturation

3. **MOOD & ATMOSPHERE**:
   - Emotion: (moody, bright, serene, dramatic, energetic, intimate, mysterious)
   - Vibe: (editorial luxury, casual lifestyle, minimalist, maximalist, artistic, cinematic)

4. **COMPOSITION & STYLING**:
   - Camera angle, framing, depth of field
   - Hair style, outfit details, accessories
   - Materials and textures visible

**YOUR TASK:** Create ${count} concepts of the USER (not the product/scene) that REPLICATE this exact aesthetic, including hair style, outfit colors, and overall styling if visible in the inspiration.
`
    : ""
}

**USER GENDER: ${userGender}**

**YOUR SIGNATURE AESTHETIC VOCABULARY:**

When describing WOMEN, use these Maya-approved descriptors:
- Hair: "cascading waves catching golden light", "sleek dark hair framing delicate features", "wind-tousled brunette locks"
- Features: "luminous skin with natural glow", "confident gaze", "serene expression", "radiant energy"
- Styling: "draped in luxurious cashmere", "adorned with delicate gold jewelry", "enveloped in soft oversized knits"
- Mood: "ethereal morning light", "sophisticated elegance", "effortless grace", "intimate confidence"

When describing MEN, use these Maya-approved descriptors:
- Hair: "sharp styled cut", "textured modern style", "clean-cut confidence"
- Features: "strong presence", "commanding confidence", "refined masculinity", "assured expression"
- Styling: "tailored precision", "structured sophistication", "refined casual elegance", "understated luxury"
- Mood: "bold architectural light", "powerful presence", "refined confidence", "modern sophistication"

**EXAMPLE OF MAYA'S POETIC STYLE:**

❌ BAD (Generic and technical):
"Professional headshot, woman, cream sweater, gold jewelry, natural light, 85mm lens, f/1.4, shallow depth of field"

✅ MAYA'S STYLE (Poetic and evocative):
"A radiant woman with cascading brunette waves catching the soft morning light, draped in an oversized cream cashmere turtleneck that pools elegantly at the shoulders, delicate 14k gold vermeil jewelry catching subtle glints of warmth - a single thin chain necklace and small hoop earrings - standing in a sun-drenched Scandinavian loft with floor-to-ceiling windows framing the gentle cityscape beyond, natural light streaming in at a 45-degree angle creating that coveted Rembrandt lighting on her luminous skin, shot on an 85mm portrait lens with dreamy shallow depth of field melting the background into soft cream bokeh, intimate and serene, editorial luxury meets effortless morning elegance"

**YOUR TASK:**

Generate ${count} UNIQUE, CREATIVE photo concepts that showcase YOUR FASHION EXPERTISE and POETIC VISION.

For each concept, write a prompt that:
1. **OPENS with the person** - Gender-aware description with hair, features, and expression
2. **DESCRIBES styling like a fashion editor** - Specific fabrics (cashmere, silk, linen), colors (not "blue" but "deep navy" or "powder blue"), textures
3. **SETS the scene poetically** - "sun-drenched loft", "moody urban alleyway with brick patina", "minimalist concrete gallery space"
4. **WEAVES IN lighting naturally** - "golden hour light streaming through sheer linen curtains", "dramatic single-source lighting creating sculptural shadows"
5. **INTEGRATES technical specs seamlessly** - "shot on vintage 85mm portrait lens with buttery bokeh", "captured on film with that coveted grain texture"
6. **ENDS with mood** - "effortless sophistication", "intimate confidence", "editorial elegance"

Return ONLY a valid JSON array with this exact structure:
[
  {
    "title": "The Modern Muse in Morning Light" (CREATIVE, NEVER GENERIC),
    "description": "Brief warm description for the user explaining the vibe",
    "category": "Close-Up" | "Half Body" | "Lifestyle" | "Action" | "Environmental",
    "fashionIntelligence": "Oversized cream Italian cashmere turtleneck, delicate 14k gold vermeil jewelry, natural glowing skin with minimal makeup",
    "lighting": "Soft directional morning light at 45 degrees through sheer curtains, creating gentle Rembrandt lighting",
    "location": "Sun-drenched minimalist loft with white walls and natural wood floors, floor-to-ceiling windows",
    "prompt": "YOUR POETIC, FLOWING, MAYA-STYLE PROMPT HERE - Remember: describe the PERSON first, style second, setting third, weave in technical details naturally"
  }
]

${referenceImageUrl ? `\n**Include referenceImageUrl in each concept for image-to-image generation**` : ""}

**REMEMBER:** You're Maya - fashion-forward, poetic, evocative. Every prompt should read like a Vogue editorial description, not a boring technical specification list.
`

      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4",
        prompt: conceptPrompt,
        maxOutputTokens: 3000,
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
      }

      if (customSettings) {
        concepts.forEach((concept) => {
          concept.customSettings = customSettings
        })
      }

      console.log("[v0] Successfully parsed", concepts.length, "concepts")

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
            "A professional headshot with soft natural light and a clean background. You'll look confident and approachable, perfect for LinkedIn or your website.",
          category: "Close-Up" as const,
          fashionIntelligence: "Elegant neutral-toned attire, minimal accessories for timeless sophistication",
          lighting:
            "Soft directional window light at 45 degrees creating gentle shadows, golden hour warmth, diffused through sheer curtains",
          location: "Modern minimalist office with concrete walls and natural wood elements, floor-to-ceiling windows",
          prompt:
            "a confident person with styled hair and natural expression, wearing elegant neutral-toned professional attire with minimal accessories, standing in a minimalist Scandinavian interior with natural wood and white walls, soft golden hour light streaming through sheer curtains creating gentle shadows and warm glow, natural skin texture with healthy glow, professional editorial quality, film grain aesthetic, timeless elegance, shot on 85mm lens with shallow depth of field and creamy bokeh background",
        },
        {
          title: "Urban Sophisticate",
          description:
            "A lifestyle photo in a modern city setting. Natural and relaxed, showing you in your element with great style and confidence.",
          category: "Lifestyle" as const,
          fashionIntelligence: "Tailored professional attire in sophisticated colors, minimal modern accessories",
          lighting:
            "Natural overcast daylight providing even, flattering illumination, soft shadows, diffused city light",
          location:
            "Contemporary city street with modern architecture and clean lines, glass facades reflecting ambient light",
          prompt:
            "full body lifestyle portrait of a confident person walking through a contemporary city street with modern architecture, natural overcast daylight creating even illumination and soft shadows, relaxed confident stride, urban sophistication, natural skin texture, editorial quality, authentic moment, shot on 35mm lens with natural depth of field capturing environmental context",
        },
        {
          title: "Golden Hour Warmth",
          description:
            "A warm, natural portrait with beautiful golden light. Soft and glowing, capturing your authentic beauty in the most flattering way.",
          category: "Close-Up" as const,
          fashionIntelligence: "Soft comfortable attire in warm tones, minimal personal accessories",
          lighting: "Golden hour sunlight streaming through large windows, warm and diffused, creating luminous glow",
          location:
            "Bright, airy interior space with plants and natural textures, Scandinavian-inspired design, organic elements",
          prompt:
            "a confident person in soft warm-toned comfortable attire in a bright airy interior with plants and natural textures, golden hour sunlight streaming through large windows creating warm diffused glow, natural skin texture with healthy glow, warm approachable expression, organic atmosphere, editorial quality, timeless natural beauty, shot on 50mm lens with medium depth of field and soft background",
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

    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

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

    if (authError || !authUser) {
      return new Response("Unauthorized", { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
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
          textContent = `[User has uploaded an inspiration image: ${inspirationImageUrl}]

**IMPORTANT**: Analyze this image carefully and create concepts that capture its style, mood, composition, and aesthetic. The user wants photos of THEMSELVES that match this inspiration.

${textContent}`
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

    let authId = user.stack_auth_id || user.supabase_user_id

    if (!authId) {
      console.log("[v0] No auth ID found, using Neon user ID as fallback")
      authId = user.id
    }

    const userContext = await getUserContextForMaya(authId)
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
`

    const lastUserMessage = messages[messages.length - 1]
    let customSettings = null

    if (lastUserMessage?.customSettings) {
      customSettings = lastUserMessage.customSettings
      console.log("[v0] 📊 Received custom settings from client:", customSettings)
    }

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
      experimental_providerMetadata: {
        customSettings,
      },
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
