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
    seed?: number
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
    customSettings: z
      .object({
        styleStrength: z.number().optional(),
        promptAccuracy: z.number().optional(),
        aspectRatio: z.string().optional(),
        seed: z.number().optional(),
      })
      .optional()
      .describe("Optional custom generation settings for style strength, prompt accuracy, etc."),
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
        })

        imageAnalysis = visionText
        console.log("[v0] 🎨 Vision analysis complete:", imageAnalysis.substring(0, 200))
      }

      
      const conceptPrompt = `You are Maya, an elite fashion and Instagram trends expert with deep knowledge of Flux AI prompting.

**🎯 YOUR MISSION: CREATE DIVERSE, CREATIVE CONCEPTS**

When generating ${count} concepts, each one should be COMPLETELY DIFFERENT:
- Different outfits and styling
- Different settings and locations
- Different lighting moods
- Different vibes and aesthetics
- Different poses and compositions

${imageAnalysis ? `
**📸 REFERENCE IMAGE ANALYSIS:**

${imageAnalysis}

**IMPORTANT:** Use this as inspiration, but create ${count} VARIED concepts based on this aesthetic.
` : ""}

**YOUR EXPERTISE:**

You know ALL Instagram aesthetics and fashion trends:
- Old Money: Ralph Lauren tennis whites, cable knit sweaters, country club elegance
- Coastal Grandmother: Nancy Meyers aesthetic, linen, seaside elegance, wicker baskets
- Y2K Revival: Low-rise jeans, baby tees, McBling energy, bold colors, flash photography
- Quiet Luxury: The Row aesthetic, cashmere, silk, minimal branding, expensive fabrics
- Mob Wife: Maximalist fur coats, bold lips, oversized sunglasses, dramatic presence
- Clean Girl: Dewy skin, slicked bun, minimal makeup, effortless beauty
- Dark Academia: Library aesthetics, moody lighting, intellectual vibes, vintage books
- Cottage Core: Pastoral settings, romantic fabrics, handmade textures, floral prints
- Street Style Editorial: Urban architecture, oversized pieces, sneaker culture, city energy
- Scandi Minimalism: Neutral tones, hygge vibes, natural textures, clean lines
- Parisian Chic: Red lips, trench coats, cafe culture, effortless elegance
- Bohemian Luxe: Flowing fabrics, earthy tones, artisanal details, free spirit
- Soft Goth: Dark femininity, romantic grunge, moody elegance
- Modern Western: Cowboy boots, denim, desert tones, ranch aesthetics

**INSTAGRAM PROMPTING BEST PRACTICES:**

1. **Optimal Length: 25-40 words** - Natural, conversational flow
2. **Specific Details:** Name exact items ("black strapless corset top" not just "top")
3. **Natural Language:** Conversational sentences, not keyword lists
4. **Lighting Specifics:** "golden hour glow", "soft overcast light", "moody window light"
5. **Real Locations:** "Parisian cafe with outdoor seating" not just "cafe"
6. **Natural Moments:** "adjusting sunglasses", "mid-laugh with coffee" not "standing stiffly"

**MANDATORY TECHNICAL SPECS (EVERY PROMPT):**
- "shot on iPhone 15 Pro" - REQUIRED for natural aesthetic
- Lens choice based on framing: 35mm (full), 50mm (medium), 85mm (close-up)
- "natural skin texture" - REQUIRED for realism
- "film grain" - REQUIRED for organic feel
- Instagram aesthetic keywords (pick 2-3): "amateur cellphone quality", "visible sensor noise", "heavy HDR glow", "blown-out highlights", "crushed shadows", "raw photography"

**CURRENT TRENDS TO REFERENCE:**
${JSON.stringify(FASHION_TRENDS_2025.instagram.aesthetics, null, 2).substring(0, 800)}...

**GENDER-SPECIFIC STYLING:**
${JSON.stringify(GENDER_SPECIFIC_STYLING[userGender], null, 2)}

**USER REQUEST:** "${userRequest}"
${aesthetic ? `**AESTHETIC FOCUS:** ${aesthetic}` : ""}
${userModifications ? `**USER MODIFICATIONS:** ${userModifications}` : ""}

**PROMPT STRUCTURE:**
"${triggerWord}, ${userGender === "woman" ? "woman" : userGender === "man" ? "man" : "person"} in [SPECIFIC outfit with exact items and fabrics], [natural activity/pose], [specific detailed location], [lighting mood and quality], [2-3 Instagram aesthetic keywords], shot on iPhone 15 Pro, [35mm/50mm/85mm] lens, natural skin texture, film grain, [optional: shallow depth of field]"

**CREATIVE FREEDOM:**
- Mix aesthetics intelligently ("coastal grandmother meets quiet luxury")
- Reference real brands when appropriate (Zara, H&M for accessible; The Row, Loro Piana for luxury)
- Use current seasonal trends
- Create unexpected but cohesive combinations
- Think like an Instagram fashion influencer creating scroll-stopping content

**OUTPUT FORMAT:**
You MUST respond with ONLY valid JSON. NO markdown, NO text before/after.

[
  {
    "title": "Concept name (specific and evocative, not generic)",
    "description": "2-3 sentence warm explanation referencing the aesthetic/trend",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Specific styling details with fabrics, brands, silhouettes",
    "lighting": "Exact lighting setup that enhances this specific style",
    "location": "Precise detailed location (not just 'urban' or 'indoors')",
    "prompt": "Full Flux prompt following all rules above"
  }
]

Generate ${count} completely DIFFERENT concepts. Make each one unique in outfit, setting, mood, and aesthetic.`

      console.log("[v0] Generating concepts with Claude Sonnet 4.5...")
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4.5",
        prompt: conceptPrompt,
        maxOutputTokens: 3000,
        temperature: 0.9, // Increased temperature for more creative variation
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
          concept.customSettings = {
            ...concept.customSettings,
            ...customSettings,
          }
        })
      }

      console.log("[v0] Successfully parsed", concepts.length, "diverse concepts")

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
    "Generate a 5-second animated video from a generated image. IMPORTANT: Always analyze the image first with vision to create a motion prompt that matches what's actually IN the image.",
  inputSchema: z.object({
    imageUrl: z.string().describe("URL of the image to animate"),
    imageId: z.string().optional().describe("Database ID of the image (if available)"),
    motionPrompt: z
      .string()
      .optional()
      .describe(
        "Motion prompt will be auto-generated based on image analysis. Only provide this if you've already analyzed the image with vision and created a context-aware prompt following Wan 2.1/2.2 best practices: Subject + Scene + Motion (with speed/amplitude modifiers like 'slowly', 'gently', 'naturally')."
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
        console.log("[v0] 🔍 No motion prompt provided, analyzing image with Claude vision...")

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

   **THE GOLDEN RULE: NATURAL INSTAGRAM B-ROLL MOVEMENT**
   
   Video models (Wan 2.1/2.2) create realistic movement with 10-15 word prompts that include context, pacing, and one clear action.
   Too short = abrupt/janky. Too long = multi-action chaos. Sweet spot = 10-15 words.

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

4. **Technical Details:**
   - Videos are 5-6 seconds long at 16fps (interpolated to 30fps)
   - Generation takes 1-3 minutes
   - User's trained LoRA model ensures character consistency
   - Wan 2.1/2.2 model handles the video generation
`

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
      temperature: 0.8, // Increased temperature for more creative responses
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
