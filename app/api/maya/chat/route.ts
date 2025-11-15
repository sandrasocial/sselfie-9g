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
    "Generate 3-5 diverse photo concepts with detailed fashion and styling intelligence. Use your comprehensive knowledge of ALL Instagram aesthetics, fashion trends, and photography styles. Match concepts to user's requests, personal brand data, or trending aesthetics. Be dynamic - don't limit yourself to preset templates. If user uploaded a reference image, analyze it visually first.",
  inputSchema: z.object({
    userRequest: z.string().describe("What the user is asking for - be specific about aesthetic, style, vibe, or trend they want"),
    aesthetic: z
      .string()
      .optional()
      .describe("Specific aesthetic/trend to focus on (e.g., 'Old Money', 'Coastal Grandmother', 'Y2K', 'Quiet Luxury', 'Dark Academia', 'Clean Girl', etc.) - use ANY Instagram trend, not just preset options"),
    context: z.string().optional().describe("Additional context about the user, occasion, or purpose"),
    userModifications: z
      .string()
      .optional()
      .describe(
        "Specific user-requested modifications like 'make clothes more oversized', 'warmer lighting', 'more realistic skin', 'add specific brand', etc."
      ),
    count: z.number().optional().default(3).describe("Number of concepts to generate (3-5)"),
    referenceImageUrl: z.string().optional().describe("If user uploaded reference image for inspiration"),
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
${aesthetic ? `- Desired Aesthetic: "${aesthetic}"` : ""}
${context ? `- Additional Context: "${context}"` : ""}
${imageAnalysis ? `\n- Reference Image Analysis: ${imageAnalysis}` : ""}
${userModifications ? `\n- User Modifications: "${userModifications}"` : ""}

**YOUR TASK:**
Generate ${count} photo concepts that EXACTLY match what the user asked for: "${userRequest}"

${aesthetic ? `**PRIMARY AESTHETIC TO USE: "${aesthetic}"**\n- Choose locations, lighting, styling, and mood that fit THIS aesthetic\n- Be authentic to the aesthetic's core characteristics\n` : ""}

**IMPORTANT RULES:**
1. **Honor user's aesthetic request** - If they want "Cozy Luxe Morning", give them warm cozy interiors with soft lighting, NOT urban streets
2. **Match lighting to aesthetic** - Warm golden hour for cozy/romantic, overcast for moody/editorial, bright for clean girl, etc.
3. **Match locations to aesthetic** - Cozy = home interior, Urban = city streets, Coastal = beach/ocean, etc.
4. **Be context-aware** - Analyze what the user is asking for and deliver that specific vibe

**POSE GUIDELINES (Natural & Authentic):**
- Use natural poses that avoid direct eye contact: "looking away over shoulder", "profile walking", "looking down at coffee", "gazing off into distance"
- Match poses to the setting and action: reading in cafe, walking on street, sitting on steps, etc.

**CONCEPT TITLE & DESCRIPTION (Natural Language):**
- **Titles:** 2-4 casual words that capture the vibe
- **Descriptions:** 1-2 simple sentences about what's happening and the mood

**EACH FLUX PROMPT MUST INCLUDE (in this order):**
1. **Trigger word:** "${triggerWord}"
2. **Gender:** "${userGender === "woman" ? "woman" : userGender === "man" ? "man" : "person"}"
3. **Outfit details** appropriate to the aesthetic (specific pieces, fabrics, colors)
4. **Natural pose** relevant to the setting and aesthetic
5. **Location** that matches the aesthetic
6. **Lighting** that matches the aesthetic mood
7. **Color grading** appropriate to aesthetic
8. **Instagram aesthetic keywords:** shot on iPhone, amateur cellphone quality, visible sensor noise, subtle HDR glow
9. **Realism keywords:** skin texture visible, film grain, raw photography

**FLUX PROMPT STRUCTURE EXAMPLE:**
"${triggerWord}, ${userGender === "woman" ? "woman" : userGender === "man" ? "man" : "person"} in [outfit matching aesthetic], [natural pose matching setting], [location matching aesthetic], [lighting matching aesthetic mood], [color grading], amateur cellphone quality, visible sensor noise, subtle HDR glow, raw photography, skin texture visible, film grain"

**FLUX PROMPT RULES:**
- Start with trigger word: "${triggerWord}"
- Then gender: "${userGender === "woman" ? "woman" : userGender === "man" ? "man" : "person"}"
- 200-250 characters total
- Natural flowing language, not robotic lists
- Rich detail on outfit, setting, lighting
- NEVER describe physical features (LoRA handles this)
- Include color grading + Instagram aesthetic + photography style

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
    "title": "Casual 2-4 word title matching the aesthetic",
    "description": "Simple 1-2 sentence description that captures the requested vibe",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Styling note relevant to the aesthetic",
    "lighting": "Lighting mood matching the aesthetic",
    "location": "Location matching the aesthetic",
    "prompt": "${triggerWord}, 200-250 char FLUX prompt with aesthetic-appropriate outfit + pose + location + lighting + color grading + Instagram aesthetic + realism"
  }
]

Generate ${count} diverse concepts that EXACTLY match the user's requested aesthetic: "${userRequest}"${aesthetic ? ` with ${aesthetic} vibe` : ""}.`

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

      yield {
        state: "error" as const,
        message: "I need a bit more direction! What aesthetic or vibe are you going for? (Examples: old money, Y2K, coastal vibes, dark academia, clean girl, mob wife, cottage core, quiet luxury, etc.)"
      }
    }
  },
})

const generateVideoTool = tool({
  description:
    "Generate a 5-second animated video from a generated image using the user's trained LoRA model for character consistency. Videos work best with SHORT, SIMPLE motion prompts.",
  inputSchema: z.object({
    imageUrl: z.string().describe("URL of the image to animate"),
    imageId: z.string().optional().describe("Database ID of the image (if available)"),
    motionPrompt: z
      .string()
      .optional()
      .describe(
        "SHORT motion prompt (MAXIMUM 15 words, ONE action only). Analyze image and create directive command. Examples: 'Brings coffee cup to lips' (5 words), 'Turns head to look out window' (6 words), 'Sitting on bed, shifts weight naturally' (6 words), 'Takes two steps, glances back' (5 words). NEVER use narrative voice, camera words, or atmosphere words. Use command verbs only."
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
            motionPrompt: motionPrompt,
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

**IMPORTANT: USER-SPECIFIC GUIDANCE**

You have access to this user's personal brand preferences above. Use them as PRIMARY guidance, but don't be limited by them. If the user requests something outside their stated preferences, absolutely honor that request.

Examples of dynamic adaptation:
- User's brand data says "Minimalist" but they request "Y2K vibes" → Give them Y2K
- User's settings show "Urban" but they ask for "Cottage core" → Create pastoral concepts
- User's fashion is "Casual" but they want "Old money aesthetic" → Style them in luxury preppy

Always prioritize:
1. User's explicit request in THIS conversation
2. User's personal brand data (as a baseline)
3. Your broad aesthetic knowledge (to enhance and elevate)

Be dynamic. Be creative. Use your full knowledge of Instagram trends and fashion.

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
   - Wait for user to pick a concept, then use generateVideo tool

2. **If user asks to animate an existing image:**
   - Use the generateVideo tool directly with the image URL
   - Create a SHORT, SIMPLE motion prompt based on the photo

3. **CRITICAL: Motion Prompt Creation Rules**

   **THE GOLDEN RULE: ONE ACTION MAXIMUM**
   
   Video models (Wan 2.1/2.2) create realistic movement ONLY when prompts are SHORT and SIMPLE.
   Complex multi-action prompts = janky unnatural movement.

   **✅ CORRECT Examples (Copy this style):**
   - "Brings coffee cup to lips for slow sip" (8 words, 1 action)
   - "Standing still, slowly turns head to look out window" (9 words, 1 action)
   - "Hand slides into coat pocket naturally" (6 words, 1 action)
   - "Walking two steps, glances back over shoulder" (7 words, 2 sequential)
   - "Leaning against wall, subtle shift of weight" (7 words, 1 action)
   - "Sitting on steps, brings coffee to lips" (7 words, 1 action)
   - "Standing with arms at sides, fingers fidget slightly" (8 words, 1 action)
   - "Adjusts necklace with natural hand movement" (6 words, 1 action)

   **❌ WRONG Examples (NEVER create prompts like this):**
   - ❌ "She gracefully sips coffee while turning her head to gaze out the window as her hair flows naturally and she leans against the counter" (25 words, 5 actions = WRONG)
   - ❌ "The camera drifts smoothly following her elegant movement through the space" (11 words, camera talk = WRONG)
   - ❌ "Creating an authentic moment of morning contemplation with natural energy" (10 words, narrative = WRONG)
   - ❌ "Walking with confidence, looking back with smile, hair catching light, adjusting sunglasses, coat flowing" (14 words, 5 actions = WRONG)

   **MANDATORY PROMPT REQUIREMENTS:**
   1. **Maximum 15 words total** - Brevity = smooth motion
   2. **ONE primary action only** - Two actions max if sequential (sip THEN look), never simultaneous
   3. **ZERO camera instructions** - Never mention: camera, pan, drift, arc, following, tracking
   4. **ZERO atmosphere words** - Never use: gracefully, effortlessly, authentically, creating, capturing, showcasing
   5. **Directive commands** - "Brings cup to lips" NOT "She gracefully sips her coffee"
   6. **No hair descriptions** - Never mention hair flowing, catching light, or falling
   7. **Subtle expressions only** - Use "slight smile" or "calm expression", never "massive smile" or "big grin"
   8. **No talking/speaking** - This is b-roll footage, no dialogue

   **SCENE ANALYSIS GUIDE:**

   When you see these elements in a photo, use these prompt patterns:

   **Coffee/Drink in photo:**
   - "Brings coffee cup to lips for slow sip"
   - "Holding coffee, slight shift of weight"
   - "Standing with coffee, looks toward window"

   **Window/Natural Light:**
   - "Standing still, slowly turns head to look out window"
   - "Looking down, lifts gaze to window"
   - "Facing forward, turns head toward light"

   **Walking/Street:**
   - "Takes two steps forward with natural stride"
   - "Mid-stride, glances back over shoulder"
   - "Walking slowly, looks back once"

   **Leaning Against Wall/Architecture:**
   - "Leaning against wall, subtle weight shift"
   - "Standing at wall, hand slides into pocket"
   - "Leaning casually, slight turn of head"

   **Sitting/Steps:**
   - "Sitting on steps, brings coffee to lips"
   - "Seated, natural shift of sitting posture"
   - "Sitting still, slight adjustment of position"

   **Adjusting Outfit/Accessories:**
   - "Hand adjusts necklace briefly"
   - "Fingers tuck hair behind ear"
   - "Adjusts sunglasses on head"
   - "Hand slides into coat pocket"

   **Minimal/Breathing Only:**
   - "Standing naturally, subtle breathing visible"
   - "Standing still, minimal head movement"
   - "Static pose, slight weight shift"

4. **Technical Details:**
   - Videos are 5-6 seconds long at 16fps (interpolated to 30fps)
   - Generation takes 1-3 minutes
   - User's trained LoRA model ensures character consistency
   - Wan 2.1/2.2 model handles the video generation
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
