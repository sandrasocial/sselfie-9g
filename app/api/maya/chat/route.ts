import { streamText, tool, type CoreMessage, generateText } from "ai"
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

const generateConceptsTool = tool({
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
  execute: async function* ({
    userRequest,
    aesthetic,
    context,
    userModifications,
    count,
    referenceImageUrl,
    customSettings,
    mode = "concept",
  }) {
    console.log("[v0] Tool executing - generating concepts for:", {
      userRequest,
      aesthetic,
      context,
      userModifications,
      count,
      referenceImageUrl,
      customSettings,
      mode, // Log the mode
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
        mode: mode, // concept = diverse, photoshoot = consistent
      })

      let imageAnalysis = ""
      if (referenceImageUrl) {
        console.log("[v0] 🔍 Analyzing reference image:", referenceImageUrl)

        const visionAnalysisPrompt = `Look at this image carefully and tell me everything I need to know to recreate this vibe.

Focus on:
1. **The outfit** - What are they wearing? Be super specific (fabrics, fit, colors, style)
2. **The pose** - How are they standing/sitting? What are their hands doing?
3. **The setting** - Where is this? What's the vibe of the location?
4. **The lighting** - What kind of light is this? (warm, cool, bright, moody, etc.)
5. **The mood** - What feeling does this give off? (confident, relaxed, mysterious, playful, etc.)
6. **Color palette** - What colors dominate the image?

Keep it conversational and specific. I need to recreate this exact vibe for Instagram.`

        const { text: visionText } = await generateText({
          model: "anthropic/claude-sonnet-4.5",
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
          temperature: 0.7,
        })

        imageAnalysis = visionText
        console.log("[v0] 🎨 Vision analysis complete")
      }

      let photoshootBaseSeed = null
      if (mode === "photoshoot") {
        photoshootBaseSeed = Math.floor(Math.random() * 1000000)
        console.log("[v0] 📸 Photoshoot mode: consistent seed:", photoshootBaseSeed)
      }

      const conceptPrompt = `Alright, let's create some amazing Instagram concepts!

**What you're working with:**

User's trigger word: ${triggerWord}
Gender: ${userGender}
Request: "${userRequest}"
${aesthetic ? `Aesthetic vibe: ${aesthetic}` : ""}
${context ? `Context: ${context}` : ""}

${
  mode === "photoshoot"
    ? `
**PHOTOSHOOT MODE:**
You're creating ${count} images for ONE Instagram carousel.
- Same outfit across all ${count} shots
- Same location/setting
- Only poses and angles change
- 30-40 words per prompt (slightly longer is OK here)
- Think: One real photoshoot session
`
    : `
**CONCEPT MODE:**
You're creating ${count} completely different standalone concepts.
- Different outfits for each
- Different locations for each
- Different vibes and stories
- 25-35 words per prompt
- Maximum diversity - each tells its own story
`
}

${
  imageAnalysis
    ? `
**REFERENCE IMAGE ANALYSIS:**

${imageAnalysis}

Use this as inspiration but keep your prompts concise (under 35 words). Capture the essence without over-describing.
`
    : ""
}

**Prompt Writing Guide:**

Remember: Shorter = better face match!

Target: 25-35 words total

Structure:
"${triggerWord}, ${userGender} in [outfit 2-4 words], [action 2-3 words], [location 2-3 words], [lighting 1-2 words], [vibe], shot on iPhone 15 Pro, [lens], natural skin texture, film grain"

Quick tips:
- "black blazer" not "luxurious black wool blazer with structure"
- "cozy cafe" not "beautiful European cafe with warm lighting"
- "sipping coffee" not "gracefully bringing cup to lips"

Always include (non-negotiable):
- "shot on iPhone 15 Pro"
- Lens: 35mm (full body), 50mm (medium), 85mm (close-up)
- "natural skin texture"
- "film grain"

**Your Task:**

Create ${count} ${mode === "photoshoot" ? "photoshoot variations" : "diverse concepts"} that feel authentic and Instagram-ready.

${mode === "concept" ? "Mix up aesthetics, locations, colors, and moods. Make each one unique!" : "Keep the outfit and location consistent. Only change poses and camera angles!"}

Return ONLY valid JSON (no markdown, no extra text):

[
  {
    "title": "Concept name",
    "description": "Brief description",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Quick outfit notes",
    "lighting": "Lighting type",
    "location": "Location description",
    "prompt": "Your concise 25-35 word prompt here"
  }
]

Start with [`

      console.log("[v0] Generating concepts with Claude Sonnet 4.5...")
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4.5",
        prompt: conceptPrompt,
        maxOutputTokens: 4000,
        temperature: 0.85,
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
        console.log("[v0] ✅ Reference image URL attached to all concepts for image-to-image generation")
      }

      if (mode === "photoshoot" && photoshootBaseSeed) {
        concepts.forEach((concept, index) => {
          if (!concept.customSettings) {
            concept.customSettings = {}
          }
          concept.customSettings.seed = photoshootBaseSeed + index
          console.log(`[v0] 🎲 Photoshoot Concept ${index + 1} seed:`, concept.customSettings.seed)
        })
      } else {
        concepts.forEach((concept, index) => {
          if (!concept.customSettings) {
            concept.customSettings = {}
          }
          concept.customSettings.seed = Math.floor(Math.random() * 1000000)
          console.log(`[v0] 🎨 Concept ${index + 1} seed (random):`, concept.customSettings.seed)
        })
      }

      if (customSettings) {
        concepts.forEach((concept) => {
          concept.customSettings = {
            ...concept.customSettings,
            ...customSettings,
          }
        })
      }

      console.log("[v0] Successfully parsed", concepts.length, "concepts in", mode, "mode")

      yield {
        state: "ready" as const,
        concepts: concepts.slice(0, count),
      }
    } catch (error) {
      console.error("[v0] Error generating concepts:", error)

      yield {
        state: "error" as const,
        message:
          "I need a bit more direction! What vibe are you going for? (Like: old money, Y2K, cozy vibes, dark academia, clean girl energy, etc.)",
      }
    }
  },
})

const generateVideoTool = tool({
  description:
    "Generate a 5-second animated video from a generated image. IMPORTANT: Always analyze the image first with vision to create a motion prompt that matches what's actually IN the image.",
  inputSchema: z.object({
    imageUrl: z.string().describe("URL of the image to animate"),
    imageId: z.string().optional().describe("Database ID of the image (if available)"),
    motionPrompt: z
      .string()
      .optional()
      .describe(
        "Motion prompt will be auto-generated based on image analysis. Only provide this if you've already analyzed the image with vision and created a context-aware prompt following Wan 2.1/2.2 best practices: Subject + Scene + Motion (with speed/amplitude modifiers like 'slowly', 'gently', 'naturally').",
      ),
  }),
  execute: async function* ({ imageUrl, imageId, motionPrompt }) {
    console.log("[v0] Video generation tool executing:", { imageUrl, imageId, motionPrompt })

    yield {
      state: "loading" as const,
      message: "Analyzing image to create natural motion...",
    }

    try {
      let finalMotionPrompt = motionPrompt

      if (!motionPrompt || motionPrompt.trim() === "") {
        console.log("[v0] 🔍 No motion prompt provided, analyzing image with Claude Sonnet 4.5 vision...")

        const visionAnalysisPrompt = `Analyze this image carefully and create a natural motion prompt for Instagram B-roll video generation (Wan 2.1/2.2 model).

**MOTION PROMPT BEST PRACTICES:**

**THE GOLDEN RULE: NATURAL INSTAGRAM B-ROLL MOVEMENT**

Video models (Wan 2.1/2.2) create realistic movement with 10-15 word prompts that include context, pacing, and one clear action.
- Too short (under 8 words) = abrupt/janky motion
- Too long (over 17 words) = multi-action chaos
- Sweet spot = **10-15 words**

**✅ CORRECT Examples (10-15 words with natural flow):**
- "Standing in cozy kitchen, slowly brings coffee mug to lips for gentle sip" (13 words)
- "Walking casually on city sidewalk, glances back over shoulder with slight smile" (12 words)
- "Sitting relaxed on cafe chair, naturally looks up from phone toward window" (12 words)
- "Leaning against brick wall, casually adjusts sunglasses with confident hand movement" (11 words)
- "Standing by window with morning light, gently tucks hair behind ear" (11 words)
- "In bedroom mirror, slowly adjusts necklace with natural delicate hand gesture" (11 words)

**❌ WRONG Examples (Too short - causes abrupt movement):**
- ❌ "Brings coffee to lips" (4 words = too abrupt, no flow)
- ❌ "Turns head slowly" (3 words = lacks context)
- ❌ "Adjusts sunglasses" (2 words = jerky motion)

**❌ WRONG Examples (Too long - causes multi-action chaos):**
- ❌ "She gracefully walks through the sunlit kitchen while turning her head to smile at the camera and brushes her flowing hair" (20+ words, 4+ actions = WRONG)

**MANDATORY PROMPT REQUIREMENTS:**
1. **10-15 words ideal** (8-17 acceptable range) - Creates smooth natural motion
2. **Brief context** (2-3 words): "in kitchen", "on sidewalk", "by window"
3. **Pacing word**: slowly, gently, casually, naturally, smoothly, softly
4. **ONE primary action** - Clear what moves and how
5. **Optional subtle detail**: "with smile", "toward light", "over shoulder"
6. **ZERO camera instructions** - Never: camera, pan, drift, arc, following, tracking
7. **ZERO narrative voice** - Never: she, he, her, his, the woman, the man
8. **Natural expressions** - Use "slight smile" or "calm expression", never exaggerated
9. **No dialogue** - This is b-roll footage, no talking/speaking

**SCENE ANALYSIS GUIDE:**

When you see these elements in a photo, use these prompt patterns:

**Coffee/Drink in photo:**
- "Holding coffee in cozy cafe, slowly brings cup to lips for warm sip"
- "Standing in kitchen with mug, gently lifts coffee while looking toward window"
- "Sitting at table with latte, casually brings cup up with natural gesture"

**Window/Natural Light:**
- "Standing by bright window, slowly turns head toward natural morning light"
- "Near window with soft glow, gently looks outside with calm expression"
- "By sunny window, naturally shifts gaze from down to light outside"

**Walking/Street:**
- "Walking casually down urban sidewalk, glances back over shoulder with slight smile"
- "Strolling through city street with confident stride, looks to side naturally"
- "Taking slow steps on pavement, turns head to look back briefly"

**Leaning Against Wall/Architecture:**
- "Leaning against brick wall, casually adjusts sunglasses with confident hand movement"
- "Standing by wall in coat, smoothly slides hand into pocket naturally"
- "Leaning relaxed on architecture, gentle weight shift with calm posture"

**Sitting/Steps:**
- "Sitting relaxed on chair, casually shifts weight and looks up naturally"
- "Seated on steps with coffee, brings cup to lips with calm motion"
- "Sitting on bed cross-legged, gently adjusts position and looks to camera"

**Adjusting Outfit/Accessories:**
- "In stylish coat, casually adjusts sunglasses on head with natural confidence"
- "Wearing statement necklace, gently touches jewelry with delicate hand gesture"
- "In full outfit, smoothly slides hand through hair with relaxed movement"

**Minimal/Breathing Only:**
- "Standing still in natural pose, subtle breathing and minimal head movement visible"
- "Facing camera in calm stance, slight weight shift with gentle expression"
- "Static position by wall, soft breathing and tiny natural body adjustments"

**YOUR TASK:**
1. Look at the person's pose, position, body language, and what they're doing
2. Identify natural movements that FIT this exact pose and setup
3. Create ONE motion prompt (10-15 words) that would look smooth and authentic

**CRITICAL RULES:**
- Only suggest movements that are PHYSICALLY POSSIBLE given the person's position
- If looking straight ahead → DON'T suggest "looks over shoulder"
- If standing still → DON'T suggest walking
- If no coffee/drink visible → DON'T mention bringing cup to lips
- Match the motion to what's ACTUALLY in the frame

Analyze THIS image and create a 10-15 word motion prompt that matches what you actually see.`

        const { text: visionMotionPrompt } = await generateText({
          model: "anthropic/claude-sonnet-4.5",
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
                  image: imageUrl,
                },
              ],
            },
          ],
        })

        finalMotionPrompt = visionMotionPrompt.trim()
        console.log("[v0] 🎨 Vision-analyzed motion prompt:", finalMotionPrompt)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/maya/generate-video`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl,
            imageId: imageId || null,
            motionPrompt: finalMotionPrompt,
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
        message: `Video generation started with motion: "${finalMotionPrompt}". This will take about ${estimatedTime}.`,
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

    const result = streamText({
      model: "anthropic/claude-sonnet-4.5",
      system: enhancedSystemPrompt,
      messages: allMessages,
      tools: {
        generateConcepts: generateConceptsTool,
        generateVideo: generateVideoTool,
      },
      maxSteps: 5,
      temperature: 0.85,
      onFinish: () => {
        console.log("[v0] streamText completed successfully")
      },
    })

    console.log("[v0] streamText initiated, returning response")

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error("[v0] Maya chat error:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      cause: error?.cause,
    })
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
