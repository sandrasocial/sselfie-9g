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

      let userGender = "person" // Default fallback
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
        // Normalize gender values: "woman"/"man"/"non-binary" from database
        const dbGender = userDataResult[0].gender.toLowerCase().trim()

        // Map database values to prompt-friendly values
        if (dbGender === "woman" || dbGender === "female") {
          userGender = "woman"
        } else if (dbGender === "man" || dbGender === "male") {
          userGender = "man"
        } else if (dbGender === "non-binary" || dbGender === "nonbinary" || dbGender === "non binary") {
          userGender = "person"
        } else {
          userGender = dbGender // Use whatever they provided
        }
      }

      const triggerWord = userDataResult[0]?.trigger_word || `user${user.id}`

      console.log("[v0] User data for concept generation:", {
        userGender,
        triggerWord,
        rawGender: userDataResult[0]?.gender,
      })

      const conceptPrompt = `You are Maya, SELFIE Studio's world-class AI Art Director with encyclopedic fashion knowledge.

**CRITICAL CONTEXT:**
- User gender: ${userGender}
- User trigger word: ${triggerWord} (DO NOT include in prompts - system adds automatically)
- User request: "${userRequest}"
${aesthetic ? `- Requested aesthetic: "${aesthetic}"` : ""}
${context ? `- Additional context: "${context}"` : ""}

**YOUR MISSION:**
Generate ${count} photo concepts with SIMPLE, CLEAN, REALISTIC prompts (30-50 words maximum).

**LIGHTING MOOD CATEGORIES (Choose from these):**

**Scandinavian / Clean Bright:**
- Soft natural daylight, bright and airy
- Clean white tones, minimal shadows
- Morning light through windows, bright studio lighting
- Fresh, clean, minimalist aesthetic

**Golden Hour:**
- Warm sunset/sunrise backlight
- Sun-kissed skin, rim lighting, golden glow
- Cinematic warmth, dreamy atmosphere
- Late afternoon magic hour

**Dark Moody:**
- Dramatic shadows, deep contrast
- Overcast lighting, moody atmosphere
- Cinematic darkness, rich blacks
- Black and white, high contrast

${
  userGender === "woman"
    ? `**CRITICAL PROMPT RULES FOR WOMEN:**

1. **Length: 30-50 words MAXIMUM** - Shorter = more realistic, less AI-looking
2. **NO trigger word** - System adds automatically
3. **Simple structure:** Woman in [outfit] + [simple action/location] + [lighting] + [aesthetic] + skin texture + film grain
4. **One fabric detail only** - Don't over-describe clothing
5. **Natural moments** - Real activities, not posed
6. **Specific lighting** - Use the mood categories above
7. **Film aesthetic references** - Portra 400, Kodak Gold 200, Tri-X 400, etc.
8. **Always mention:** real/natural skin texture, visible pores/detail, film grain

**EXAMPLE PROMPT STRUCTURE (Follow this):**

"Woman in [one clothing item with fabric], [simple action/location], [specific lighting from mood category], [aesthetic descriptor], real skin texture with [detail], [film type] aesthetic"

**GOOD EXAMPLES:**

"Woman in cream knit loungewear sitting beside large window with city view, soft natural window light, airy and bright atmosphere, real skin texture with visible pores, subtle film grain, editorial lifestyle photography"

"Woman in tailored black power suit, minimal beige backdrop, dramatic side lighting with deep shadows, sleek glam makeup, cinematic Vogue editorial style, rich blacks, film grain, visible skin detail"

"Woman in designer athleisure holding green juice, walking down palm-lined Beverly Hills street, warm golden hour backlight with soft glow and sun flares, natural skin texture, Kodak Portra 400 film grain aesthetic"

"Woman in vintage band tee and black leather jacket leaning against brick wall, moody overcast lighting with muted tones, effortless cool vibe, real skin with natural makeup, Tri-X 400 film grain"

**ACTIVITIES FOR WOMEN:**
- Sitting beside window, standing at café, walking down street
- Lounging on chair, leaning against wall, adjusting clothing
- Holding coffee/juice, looking at phone, relaxed moments
- At rooftop, in doorway, by window, natural authentic poses`
    : userGender === "man"
      ? `**CRITICAL PROMPT RULES FOR MEN:**

1. **Length: 30-50 words MAXIMUM**
2. **NO trigger word** - System adds automatically
3. **Simple structure:** Man in [outfit] + [location/action] + [lighting] + [aesthetic] + skin texture + film grain
4. **One fabric detail only**
5. **Confident masculine moments** - Strong, editorial poses
6. **Specific lighting** - Use mood categories
7. **Film aesthetic references** - Portra 400, Tri-X 400, Kodak Gold
8. **Always mention:** real/natural skin texture, film grain
9. **Masculine descriptors:** confident, sharp, powerful, cinematic GQ/Esquire style
10. **NEVER describe hair, facial hair, beards, or hair color** - User's LoRA model handles this

**EXAMPLE PROMPT STRUCTURE (Follow this):**

"Man in [one clothing item with fabric], [simple action/location], [specific lighting from mood category], [aesthetic descriptor], real skin texture with [detail], [film type] aesthetic"

**GOOD EXAMPLES:**

"Man in grey knit sweater working at desk beside large window with city view, soft natural window light, airy and bright atmosphere, real skin texture with visible pores, subtle film grain, editorial lifestyle photography"

"Man in tailored charcoal three-piece suit, minimal dark backdrop, dramatic side lighting with deep shadows, cinematic GQ editorial style, rich blacks, film grain, visible skin detail"

"Man in designer black bomber jacket and slim jeans walking down urban street, warm golden hour backlight with soft glow and sun flares, natural skin texture, Kodak Portra 400 film grain aesthetic"

"Man in sleek black turtleneck, dramatic Rembrandt lighting with deep shadows, moody studio atmosphere, cinematic Esquire aesthetic, visible skin texture with natural detail, pushed film grain"

"Man in navy henley shirt sitting at kitchen counter with coffee cup, soft morning light through sheer curtains, bright and airy Scandinavian aesthetic, real natural skin texture, minimal grain"

**ACTIVITIES FOR MEN:**
- Working at desk, sitting with coffee, walking urban streets
- Standing at windows, leaning against walls, confident poses
- Adjusting watch/jacket, looking at cityscape, editorial stances
- At rooftops, in offices, by architecture, strong masculine presence`
      : `**CRITICAL PROMPT RULES:**

1. **Length: 30-50 words MAXIMUM**
2. **NO trigger word** - System adds automatically
3. **Simple structure:** Person in [outfit] + [location/action] + [lighting] + [aesthetic] + skin texture + film grain
4. **Natural authentic moments**
5. **Specific lighting** - Use mood categories
6. **Film aesthetic references** - Portra 400, Kodak Gold, Tri-X 400
7. **Always mention:** real/natural skin texture, film grain`
}

**WHAT TO AVOID:**
❌ Long descriptions (60+ words)
❌ Excessive pose instructions
❌ Multiple clothing items
❌ Generic lighting
❌ Missing skin texture or film grain

**WHAT TO INCLUDE:**
✅ One key clothing piece
✅ Simple action or location
✅ Specific lighting mood
✅ Editorial aesthetic
✅ Real skin texture
✅ Film grain reference

Now generate ${count} diverse concepts as JSON array. Mix different lighting moods, activities, and clothing styles.

[
  {
    "title": "Brief evocative title",
    "description": "2-3 sentence warm description",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Quick styling note",
    "lighting": "Specific lighting from mood category",
    "location": "Exact location",
    "prompt": "30-50 word clean prompt following the examples"
  }
]`

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
          title: "Morning Coffee Ritual",
          description:
            "A warm lifestyle moment captured while enjoying morning coffee by the window. Natural and authentic.",
          category: "Half Body Lifestyle" as const,
          fashionIntelligence: "Comfortable elevated style in soft neutrals",
          lighting: "Soft morning window light, warm golden glow",
          location: "Modern minimalist space with large windows",
          prompt:
            "Person in cream knit sweater sitting beside large window with city view, soft natural window light, airy and bright atmosphere, real skin texture with visible pores, subtle film grain, editorial lifestyle photography",
        },
        {
          title: "Urban Commute",
          description: "Captured mid-stride walking through city streets. Dynamic and confident.",
          category: "Environmental Portrait" as const,
          fashionIntelligence: "Contemporary urban styling with structured outerwear",
          lighting: "Overcast natural light, soft even illumination",
          location: "Modern city street with clean architecture",
          prompt:
            "Person in tailored black jacket, minimal backdrop, dramatic side lighting with deep shadows, cinematic editorial style, rich blacks, film grain, visible skin detail",
        },
        {
          title: "Creative Focus",
          description: "Deep in concentration while working. Intimate and authentic.",
          category: "Close-Up Portrait" as const,
          fashionIntelligence: "Relaxed creative attire in warm tones",
          lighting: "Warm desk lamp mixing with natural window light",
          location: "Home creative workspace with natural textures",
          prompt:
            "Person in casual attire at workspace, warm golden hour light, natural concentration, real skin texture, Kodak Portra 400 film grain aesthetic",
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
      throw new Error("Invalid messages format")
    }

    if (authError || !authUser) {
      throw new Error("Unauthorized")
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      throw new Error("Unauthorized")
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
          console.log("[v0] 🎨 Creating vision message with image URL:", inspirationImageUrl)
          return {
            role: msg.role,
            content: [
              {
                type: "text" as const,
                text: textContent,
              },
              {
                type: "image" as const,
                image: inspirationImageUrl,
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
