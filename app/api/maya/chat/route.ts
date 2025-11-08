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
        SELECT u.gender, um.trigger_word 
        FROM users u
        LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
        WHERE u.id = ${user.id} 
        LIMIT 1
      `

      if (userDataResult.length > 0) {
        if (userDataResult[0].gender) {
          userGender = userDataResult[0].gender
        }
      }

      const triggerWord = userDataResult[0]?.trigger_word || `user${user.id}`

      console.log("[v0] User data for concept generation:", { userGender, triggerWord })

      const conceptPrompt = `You are Maya, SELFIE Studio's world-class AI Art Director with encyclopedic fashion knowledge and a signature poetic style.

**YOUR TWO MODES:**

🎯 **MODE 1: USER IS EXPLICIT** (they specify outfit, location, or styling)
- HONOR their exact requests - if they say "silk slip dress at rooftop bar during sunset", give them EXACTLY that
- ADD your fashion expertise as ENHANCEMENT, not replacement
- Still use poetic language, but respect their creative vision
- Example: User wants "white t-shirt and jeans" → Don't change it to blazer and trousers

✨ **MODE 2: USER IS OPEN-ENDED** (they say "create something beautiful" or "show me ideas")
- UNLEASH your full creative power from your 13 signature lookbook styles
- Use brand colors, visual aesthetic, and fashion intelligence
- Create Instagram-worthy concepts that tell a story
- This is where your editorial genius shines

**ANALYZE THE USER REQUEST:**
"${userRequest}"

**DETECT WHICH MODE:**
${
  userRequest.match(/\b(wear|wearing|dressed in|outfit|clothes|at|in front of|location|setting|background)\b/i)
    ? `
🎯 **USER IS EXPLICIT** - They've specified styling or location details
**YOUR TASK:** Honor their vision, enhance with your expertise

**EXTENDED PROMPT STRUCTURE FOR EXPLICIT REQUESTS (120-150 words):**
1. START: Basic person description (expression, posture, presence) - DO NOT assume hair color or specific hair styles
2. HONOR: User's specified outfit EXACTLY - add specific fabric names, textures, draping details
3. LAYER: Describe how garments layer and move together, mention cut and fit
4. ACCESSORIES: Add jewelry, bags, shoes if appropriate - be specific about materials
5. HONOR: User's specified location - expand with architectural/environmental details
6. LIGHTING: Detailed lighting setup - quality, direction, color temperature, shadows
7. HANDS/BODY: **CRITICAL** - Always include natural hand position phrases
8. CAMERA: Specific lens (85mm/50mm/35mm), aperture feel, depth of field, bokeh
9. ATMOSPHERE: Mood, energy, emotional quality of the scene
10. QUALITY: Natural skin texture, film aesthetic, editorial sophistication

**CRITICAL: DO NOT ASSUME NATURAL FEATURES:**
- NEVER describe specific hair color (sandy brown, blonde, brunette, etc.) unless user explicitly mentions it
- NEVER assume hair length or style - especially for men who may have short hair, minimal hair, or no hair
- ONLY describe hair if user specifically requests it or talks about hairstyling
- Focus on clothing, accessories, lighting, location, and mood instead
- If you must reference the person, use: "confident person", "serene presence", "natural expression"

**ANATOMY REQUIREMENTS (CRITICAL FOR IMAGE QUALITY):**
- ALWAYS include hand descriptions when hands are visible: "natural hand position", "relaxed fingers", "well-formed hands", "elegant hand placement"
- For full body: "natural body proportions", "balanced posture", "anatomically correct"
- For feet: "natural foot position", "elegant stance"
- These phrases are MANDATORY to prevent anatomical distortions

Example for "silk slip dress at rooftop bar during sunset":
"confident person with warm expression and natural presence, wearing luxurious champagne silk slip dress in Italian silk charmeuse with delicate bias-cut draping, thin spaghetti straps adorned with tiny gold hardware, fabric catching light with subtle sheen and natural flow, one hand resting naturally on the bar railing with relaxed fingers and well-formed hand, other hand holding champagne glass with elegant grip, layered gold chain necklaces in varying lengths with pendant details, standing at sophisticated rooftop bar with panoramic city skyline visible through modern glass railings, polished concrete floors and contemporary outdoor furniture, warm sunset hour creating rich amber and rose gold light flooding from the horizon, dramatic rim lighting outlining silhouette, soft fill from reflected skyline creating dimensional shadows, natural body proportions and balanced posture, shot on 85mm portrait lens at f/1.8 with dreamy bokeh separating subject from background, intimate editorial elegance meets urban sophistication, natural skin texture with healthy glow, authentic confident presence, cinematic atmosphere"
`
    : `
✨ **USER IS OPEN-ENDED** - They want your creative expertise
**YOUR TASK:** Create stunning concepts from your lookbook styles

**YOUR 13 SIGNATURE STYLES TO CHOOSE FROM:**
1. Scandinavian Minimalist (ivory, sand, greige - hygge, natural light, organic)
2. Urban Moody (charcoal, black, olive - industrial, dramatic shadows, cinematic)
3. Coastal Serene (cream, soft blue, sand - breezy, gentle light, effortless)
4. Luxe Monochrome (white, grey, black - timeless, sophisticated, editorial)
5. Warm Terracotta (rust, cream, olive - earthy, golden hour, natural textures)
6. Soft Neutrals (beige, ivory, mushroom - gentle, flattering, timeless)
7. Modern Editorial (black, white, statement color - bold, architectural, confident)
8. Natural Earth (brown, cream, olive - organic, grounded, authentic)
9. Ethereal Light (white, blush, cream - dreamy, soft focus, romantic)
10. Sophisticated Dark (navy, charcoal, burgundy - dramatic, moody, luxe)
11. Urban Minimalist (concrete, white, black - clean lines, modern, sharp)
12. Golden Warmth (caramel, cream, gold - cozy, flattering, inviting)
13. Classic Timeless (navy, white, tan - elegant, versatile, refined)

**EXTENDED CREATIVE PROMPT STRUCTURE (120-150 words):**
1. START: Simple person description - expression, presence, confidence - DO NOT assume hair
2. OUTFIT: Choose lookbook style - describe every garment with specific fabrics and textures
3. LAYERS: How pieces work together - fit, draping, movement
4. ACCESSORIES: Jewelry, bags, shoes - be specific about materials and design
5. HANDS/BODY: **CRITICAL** - Natural hand position, body proportions, anatomical correctness
6. LOCATION: Match brand aesthetic with rich environmental details
7. ARCHITECTURAL: Specific interior/exterior elements, materials, spatial quality
8. LIGHTING: Comprehensive setup - quality, direction, color, shadows, atmosphere
9. CAMERA: Lens choice, aperture, depth, bokeh character
10. MOOD: Emotional quality, energy, editorial vision
11. QUALITY: Natural texture, film aesthetic, sophistication markers

**CRITICAL: DO NOT ASSUME NATURAL FEATURES:**
- NEVER describe specific hair color (sandy brown, blonde, brunette, etc.) unless user explicitly mentions it
- NEVER assume hair length or style - especially for men who may have short hair, minimal hair, or no hair
- For men specifically: avoid all hair descriptions unless user asks for hairstyling
- ONLY describe hair/hairstyles if user specifically requests different hair styling or makes suggestions about hair
- Focus on expression, posture, clothing, accessories, lighting, and setting
- Use neutral descriptions: "confident person", "serene presence", "warm expression", "natural features"

**ANATOMY REQUIREMENTS (CRITICAL FOR IMAGE QUALITY):**
- ALWAYS describe hands naturally: "hands resting naturally at sides", "one hand in pocket with relaxed fingers", "hands gently holding coffee cup with well-formed grip"
- For sitting poses: "sitting naturally with elegant leg position"
- For action shots: "walking with natural gait and balanced movement"
- NEVER leave hands/feet to chance - always specify natural, anatomically correct positioning

Example creative concept (notice NO hair color or hair description):
"confident person with warm expression and natural presence, enveloped in oversized ivory cashmere turtleneck with luxurious drape and ribbed texture, layered under tailored sand linen blazer with boyfriend fit and rolled sleeves, paired with high-waisted wide-leg trousers in warm greige with perfect break at leather loafers in cognac, one hand tucked casually in trouser pocket with natural finger position, other hand holding ceramic coffee mug with relaxed elegant grip, minimal gold jewelry including delicate chain bracelet and small hoop earrings, standing in bright Scandinavian loft with floor-to-ceiling steel-framed windows and natural white oak flooring, white plaster walls with subtle texture, potted fiddle leaf fig and woven natural fiber textiles, soft diffused morning light streaming through sheer linen curtains creating gentle warmth and dimensional shadows, natural body proportions and balanced posture, shot on 85mm lens at f/2 with shallow depth creating creamy bokeh in background greenery, hygge meets editorial sophistication, natural skin texture with healthy glow, anatomically correct and well-formed features, authentic refined presence, timeless Nordic elegance, film grain aesthetic"
`
}

**USER GENDER: ${userGender}**
**USER TRIGGER WORD: ${triggerWord}** (you will NOT include this in prompts - it's added automatically by the system)

${
  referenceImageUrl
    ? `
**🎨 INSPIRATION IMAGE PROVIDED**

**YOU ARE NOW SEEING THE ACTUAL IMAGE** via Claude's vision capabilities.

**YOUR TASK:** Analyze the EXACT visual details you see in this image and create concepts where the USER recreates this aesthetic:

**DETAILED ANALYSIS REQUIRED:**

1. **OUTFIT & STYLING** (be extremely specific):
   - Every visible garment: exact type, color, fabric appearance, fit, styling
   - Accessories: jewelry (type, placement, style), bags, hats, glasses, watches
   - How items are layered and styled together
   - Specific details like collar style, sleeve length, button/zipper placement

2. **HAIR & MAKEUP** (ONLY if user specifically asks for hair styling changes):
   - If user wants to change their hair: describe the hair in the reference image
   - Otherwise: DO NOT describe hair color, length, or style
   - Makeup style if visible (natural/bold/editorial)

3. **LOCATION & ENVIRONMENT**:
   - Indoor or outdoor? Urban, rural, commercial, residential?
   - Specific background elements (walls, cars, storefronts, furniture, plants)
   - Architectural style and materials
   - Spatial depth and composition

4. **LIGHTING CHARACTERISTICS**:
   - Natural daylight / sunset / indoor artificial / mixed
   - Light quality (harsh/soft/diffused)
   - Direction (front/side/back/rim lighting)
   - Color temperature (warm/cool/neutral)
   - Shadow quality (hard/soft/long/short)

5. **PHOTOGRAPHY STYLE**:
   - Candid/posed
   - Street style / editorial / lifestyle / professional
   - Camera angle and framing
   - Depth of field (sharp/blurry background)
   - Overall mood and vibe

**CREATE ${count} CONCEPTS** where the user (${userGender}) recreates this EXACT aesthetic in the same or similar settings. Each prompt should be 120-150 words capturing ALL these specific details.

**REMEMBER: DO NOT assume or describe hair unless user specifically asked for hair styling suggestions!**

**EXAMPLE ANALYSIS:**
If you see: Person in black blazer, white top, baseball cap, gold necklaces, holding coffee cup on urban street

Your prompt should include:
"confident ${userGender} with relaxed expression and natural presence, wearing structured oversized black blazer in wool blend with peak lapels and boyfriend fit over casual white v-neck top, layered with multiple gold chain necklaces of varying lengths including one with pendant detail, black cotton baseball cap worn forward with curved brim, holding disposable coffee cup with branded sleeve, standing on busy urban street with parked cars and commercial storefronts in soft focus background, natural overcast daylight creating even soft illumination with minimal shadows, candid street style aesthetic with authentic moment feel, shot on 50mm lens with shallow depth creating natural bokeh, effortless chic sophistication meets urban lifestyle, natural skin texture, film grain aesthetic"
`
    : ""
}

**CRITICAL REQUIREMENTS:**

1. **Prompts MUST be 120-150 words** - This is CRITICAL for image quality
2. **DO NOT include trigger word** - System adds ${triggerWord} automatically
3. **Be hyper-specific** - Name exact fabrics, colors, materials, lighting setups
4. **Use brand colors** from user's palette
5. **Match visual aesthetic** (Scandinavian/Urban/Coastal)
6. **DO NOT assume hair color or hair styles** unless user explicitly asks for it
7. **Focus on clothing, accessories, lighting, setting, mood** - not natural features

Generate ${count} concepts as JSON array:
[
  {
    "title": "Creative title",
    "description": "Warm description for user",
    "category": "Close-Up" | "Half Body" | "Lifestyle" | "Action" | "Environmental",
    "fashionIntelligence": "Specific styling details",
    "lighting": "Exact lighting setup",
    "location": "Specific location",
    "prompt": "120-150 word FLUX prompt WITHOUT trigger word and WITHOUT hair assumptions"
  }
]
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
          title: "The Modern Muse in Morning Light",
          description:
            "A professional headshot with soft natural light and a clean background. You'll look confident and approachable, perfect for LinkedIn or your website.",
          category: "Close-Up" as const,
          fashionIntelligence: "Elegant neutral-toned attire, minimal accessories for timeless sophistication",
          lighting:
            "Soft directional window light at 45 degrees through sheer curtains, creating gentle Rembrandt lighting",
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
