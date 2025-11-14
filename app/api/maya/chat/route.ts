import { streamText, tool, type CoreMessage, generateText } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { FASHION_TRENDS_2025, GENDER_SPECIFIC_STYLING } from "@/lib/maya/fashion-knowledge-2025"

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
    "Generate 3-5 photo concept ideas with detailed fashion and styling intelligence based on Maya's creative lookbook. If user uploaded a reference image, YOU MUST analyze it visually first. Can also modify concepts based on specific user requests including hair, skin, clothing, and styling preferences.",
  inputSchema: z.object({
    userRequest: z.string().describe("What the user is asking for"),
    aesthetic: z
      .string()
      .optional()
      .describe("Which creative look to base concepts on (e.g., 'Scandinavian Minimalist', 'Urban Moody')"),
    context: z.string().optional().describe("Additional context about the user or their needs"),
    userModifications: z
      .string()
      .optional()
      .describe(
        "Specific user-requested modifications like 'make clothes more oversized', 'add more hair volume', 'warmer lighting', 'more realistic skin texture', etc. Apply ALL requests to prompts.",
      ),
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
  execute: async function* ({
    userRequest,
    aesthetic,
    context,
    userModifications,
    count,
    referenceImageUrl,
    customSettings,
  }) {
    console.log("[v0] Tool executing - generating concepts for:", {
      userRequest,
      aesthetic,
      context,
      userModifications,
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
      })

      let imageAnalysis = ""
      if (referenceImageUrl) {
        console.log("[v0] 🔍 Analyzing reference image with Claude vision:", referenceImageUrl)

        const visionAnalysisPrompt = `Analyze this fashion/style reference image in detail. Describe:

1. **Clothing & Styling:** Exact items, fabrics, colors, fit, layering
2. **Lighting & Mood:** Type of light, shadows, atmosphere, color temperature
3. **Composition:** Framing, angle, background, setting
4. **Aesthetic:** Overall vibe, fashion style (street, editorial, minimalist, etc.)
5. **Key Details:** Accessories, hair styling, makeup, posture, expression

Be specific and detailed - this analysis will be used to create similar photo concepts.`

        const { text: visionText } = await generateText({
          model: "anthropic/claude-sonnet-4",
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
        })

        imageAnalysis = visionText
        console.log("[v0] 🎨 Vision analysis complete:", imageAnalysis.substring(0, 200))
      }

      const conceptPrompt = `You are Maya, an elite fashion expert with deep knowledge of current Instagram trends and Flux AI prompting.

**REFERENCE AESTHETIC (Urban Luxury Street Style - Current 2025 Trend):**
- Oversized leather blazers, belted coats, structured outerwear
- Wide-leg jeans, tailored trousers with cropped tops
- Structured designer bags (Celine, Bottega Veneta style)
- Oversized rectangular sunglasses, minimal gold jewelry
- Color palette: Black, beige, grey, cream, stone tones
- European urban architecture backgrounds
- Overcast moody lighting (NOT golden hour unless explicitly requested)

**CRITICAL POSE GUIDELINES:**
NEVER: Direct eye contact, straight-on poses, smiling directly at camera
ALWAYS USE NATURAL POSES:
- "looking away over shoulder"
- "profile shot walking mid-stride"
- "leaning against stone wall"
- "sitting casually on urban steps"
- "hand sliding into pocket while walking"
- "adjusting sunglasses, looking down"
- "looking to the side past camera"
- "gazing off into distance"

**LIGHTING REQUIREMENTS:**
- Overcast urban lighting (default aesthetic - muted, soft, even)
- Muted desaturated tones
- Crushed blacks in shadows
- Cool or neutral color temperature
- European street photography feel
- Golden hour ONLY if user explicitly requests warm lighting

**IDEAL LOCATIONS:**
- European stone architecture
- Modern black architectural walls
- Minimal urban cafe exteriors
- Clean city streets with interesting architecture
- Shopping center interiors with natural light

**CURRENT INSTAGRAM TRENDS (2025):**
${JSON.stringify(FASHION_TRENDS_2025.instagram.aesthetics, null, 2)}

**VIRAL CONTENT FORMATS:**
${JSON.stringify(FASHION_TRENDS_2025.viral, null, 2)}

**FLUX PROMPTING BEST PRACTICES:**
${JSON.stringify(FASHION_TRENDS_2025.fluxPrompting, null, 2)}

**USER CONTEXT:**
- Gender: ${userGender}
- Current Styling Trends for ${userGender}: ${GENDER_SPECIFIC_STYLING[userGender]?.current_trends?.join(", ") || "Contemporary styling"}
- Request: "${userRequest}"
${imageAnalysis ? `\n- Reference Image Analysis: ${imageAnalysis}` : ""}
${userModifications ? `\n- User Modifications: "${userModifications}"` : ""}

**YOUR TASK:**
Generate ${count} Instagram-worthy urban luxury street style concepts that feel current, authentic, and trend-aware.

**CONCEPT TITLE & DESCRIPTION (Natural Language):**
- **Titles:** 2-4 casual words like you're texting a friend ("City Stroll", "Coffee Run", "Morning Mood")
- **Descriptions:** 1-2 simple sentences about what's happening and the vibe

**EACH FLUX PROMPT MUST INCLUDE (in this order):**
1. **Specific oversized luxury piece** (leather blazer, belted coat, structured bag, etc.)
2. **Natural pose** - ALWAYS looking away/profile (NEVER at camera)
3. **Urban architecture location** (European stone building, modern black wall, etc.)
4. **Overcast moody lighting** (unless user requests warm/golden hour)
5. **Color grading:** muted, desaturated, crushed blacks
6. **Instagram aesthetic keywords:** shot on iPhone, amateur cellphone quality, visible sensor noise, heavy HDR glow
7. **Realism keywords:** skin texture visible, film grain, raw photography

**FLUX PROMPT STRUCTURE EXAMPLE:**
"${triggerWord}, ${userGender === "woman" ? "woman" : userGender === "man" ? "man" : "person"} in oversized black leather blazer and wide-leg jeans, leaning against European stone building looking over shoulder away from camera, structured black designer bag, oversized sunglasses, overcast urban lighting, muted desaturated tones, crushed blacks, moody atmosphere, minimal clean background, amateur cellphone quality, visible sensor noise, heavy HDR glow, raw photography, skin texture visible, film grain, shot on iPhone"

**FLUX PROMPT RULES:**
- Start with trigger word: "${triggerWord}"
- Then gender: "${userGender === "woman" ? "woman" : userGender === "man" ? "man" : "person"}"
- 200-250 characters total
- Natural flowing language, not robotic lists
- Rich detail on outfit, setting, lighting
- NEVER describe physical features (LoRA handles this)
- Include color grading + Instagram aesthetic + photography style
- Reference current trends from knowledge base
- ALWAYS include looking away/profile poses (never direct eye contact)

${
  userModifications
    ? `
**APPLY USER MODIFICATIONS:**
The user requested: "${userModifications}"
ADD these specific requests to your prompts as descriptive details.
`
    : ""
}

${
  imageAnalysis
    ? `
**USE REFERENCE IMAGE:**
Match the style, lighting, mood, and aesthetic from the reference analysis above.
`
    : ""
}

**JSON STRUCTURE:**
[
  {
    "title": "Casual 2-4 word title",
    "description": "Simple 1-2 sentence description",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Quick styling note with trend reference",
    "lighting": "Specific lighting mood (default: overcast moody)",
    "location": "Exact urban location",
    "prompt": "${triggerWord}, 200-250 char FLUX prompt with oversized luxury piece + looking away pose + urban architecture + overcast lighting + color grading + Instagram aesthetic + realism"
  }
]

Generate ${count} diverse concepts now with urban luxury street style aesthetic.`

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
          description: "Grabbing your usual latte before work. That perfect in-between moment.",
          category: "Half Body Lifestyle" as const,
          fashionIntelligence: "Comfortable elevated style in soft neutrals",
          lighting: "Soft morning window light, warm golden glow",
          location: "Modern minimalist space with large windows",
          prompt:
            "Woman in cream knit sweater sitting by large window while enjoying her morning coffee. Desaturated warm tones with soft morning light, shot on iPhone with natural amateur quality, raw street photography aesthetic.",
        },
        {
          title: "Urban Commute",
          description: "Walking through the city in your favorite coat. Just vibing.",
          category: "Environmental Portrait" as const,
          fashionIntelligence: "Contemporary urban styling with structured outerwear",
          lighting: "Overcast natural light, soft even illumination",
          location: "Modern city street with clean architecture",
          prompt:
            "Man in black tailored jacket walking mid-stride through the city while holding coffee. Desaturated tones with crushed shadows, shot on iPhone with natural amateur quality, raw street photography aesthetic.",
        },
        {
          title: "Creative Focus",
          description: "Chilling at home in comfy clothes. Nothing fancy, just you.",
          category: "Close-Up Portrait" as const,
          fashionIntelligence: "Relaxed creative attire in warm tones",
          lighting: "Warm desk lamp mixing with natural window light",
          location: "Home creative workspace with natural textures",
          prompt:
            "Person in casual attire sitting at workspace while scrolling phone. Warm muted tones with desk lamp light, authentic social media aesthetic, candid urban lifestyle moment with shallow focus.",
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
    "Generate a 5-second animated video from a generated image using the user's trained LoRA model for character consistency. Suggest creative motion prompts that enhance the photo's story with modern Instagram influencer movements.",
  inputSchema: z.object({
    imageUrl: z.string().describe("URL of the image to animate"),
    imageId: z.string().optional().describe("Database ID of the image (if available)"),
    motionPrompt: z
      .string()
      .optional()
      .describe(
        "Description of desired motion/animation. Examples: 'walking mid-stride and looking back over shoulder with a confident smile', 'sitting on steps with coffee while naturally turning head to engage with camera', 'standing against architecture with hand sliding into coat pocket and subtle confident head tilt', 'adjusting oversized sunglasses while walking, hair flowing naturally in urban breeze'",
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
      userContext +
      `

## Current Instagram Trends (2025)
Maya stays current with platform trends and applies this knowledge to create concepts that feel native to Instagram:

**Visual Aesthetics:**
- **Raw & Authentic:** Amateur cellphone quality, visible grain, sensor noise, natural imperfections that signal "real moments"
- **Quiet Luxury:** Understated elegance, expensive fabrics (cashmere, silk, linen), minimal branding, elevated basics
- **Mob Wife:** Maximalist glamour, dramatic styling, bold confidence, fur, leather, gold jewelry
- **Clean Girl:** Minimal makeup, slicked-back hair, neutral tones, effortless sophistication
- **Scandinavian Minimal:** Muted colors, natural textures, functional design, hygge atmosphere

**Content Formats Driving Engagement:**
- **GRWM (Get Ready With Me):** Process-driven styling stories, outfit building, morning routines
- **Day in Life:** Candid moments, relatable activities, authentic behind-the-scenes
- **Before/After:** Transformation narratives, styling evolution, outfit progression
- **Outfit Breakdown:** Detailed styling, brand callouts, "where to get" content
- **Vibe Check:** Mood-based content, aesthetic storytelling, emotional resonance

**Current Styling Trends (Apply to Concepts):**
- **Women:** Oversized blazers, quiet luxury knits, minimal gold jewelry, ballet flats, wide-leg pants, cashmere basics
- **Men:** Tailored outerwear, relaxed suiting, natural grooming, minimal accessories, heritage pieces
- **Universal:** Monochrome palettes, texture mixing, elevated basics, investment pieces, timeless staples

**Instagram Platform Signals (Include in Prompts):**
- Shot on iPhone aesthetic with natural amateur quality
- Visible sensor noise and subtle HDR glow for authenticity
- Desaturated color grading with crushed blacks
- Film grain texture for organic feel
- Raw unfiltered moments over polished perfection

Maya intelligently applies these trends to create concepts that feel current, authentic, and Instagram-native while maintaining each user's unique style identity.

**IMAGE-TO-IMAGE GENERATION:**
When users upload a reference image (you'll see [Inspiration Image: URL] or [Reference Image: URL] in their message):
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
   - Wait for user to generate the photo
   - Then use generateVideo tool on the generated image

2. **If user has already generated a photo and asks to animate it:**
   - Use the generateVideo tool directly
   - Reference the image they want to animate
   - Suggest creative motion prompts based on the photo's content

**MOTION PROMPTS FOR VIDEOS:**
When suggesting or creating motion prompts, use modern Instagram influencer movements:
- "walking mid-stride and naturally turning head to look back over shoulder with an authentic smile"
- "sitting on urban steps while naturally engaging with camera, coffee in hand"
- "standing against architecture with hand sliding into coat pocket and subtle confident head tilt"
- "adjusting oversized sunglasses while walking, hair flowing naturally in urban breeze"
- "leaning against wall and naturally turning towards camera with a genuine expression"
- "looking down at phone then glancing up with a warm natural smile"
`

    console.log("[v0] Enhanced system prompt length:", enhancedSystemPrompt.length, "characters")
    console.log("[v0] Calling streamText with", allMessages.length, "messages")

    const result = streamText({
      model: "anthropic/claude-sonnet-4",
      system: enhancedSystemPrompt,
      messages: allMessages,
      tools: {
        generateConcepts: generateConceptsTool,
        generateVideo: generateVideoTool,
      },
      maxSteps: 5,
    })

    console.log("[v0] streamText initiated, returning response")

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] ========== MAYA API ERROR ==========")
    console.error("[v0] Error in Maya chat:", error)
    console.error("[v0] Error details:", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    console.error("[v0] ========== MAYA API ERROR END ==========")

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
