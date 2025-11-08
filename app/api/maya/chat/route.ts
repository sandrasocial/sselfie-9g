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
        LEFT JOIN user_models um ON u.id = um.user_id AND um.status = 'completed'
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

**PROMPT STRUCTURE FOR EXPLICIT REQUESTS:**
1. START: [gender-aware description only - NO trigger word here]
2. HONOR: User's specified outfit/styling EXACTLY as requested
3. HONOR: User's specified location/setting EXACTLY as requested  
4. ENHANCE: Add fabric details, specific color names, texture descriptions
5. ENHANCE: Perfect the lighting for their scenario
6. ENHANCE: Add technical specs naturally (lens, depth of field)
7. CLOSE: Mood that matches their vision

Example: If user says "silk slip dress at rooftop bar during sunset"
→ "confident woman in luxurious champagne silk slip dress with delicate spaghetti straps, standing at a luxury rooftop bar with panoramic city views, golden sunset hour light creating warm amber glow, 85mm portrait lens with soft bokeh, intimate editorial elegance"
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

**PROMPT STRUCTURE FOR CREATIVE CONCEPTS:**
1. START: [gender-aware description with brand styling - NO trigger word]
2. OUTFIT: Choose from lookbook style - specific fabrics, colors FROM BRAND PALETTE
3. LOCATION: Match brand aesthetic (Scandinavian loft / Urban street / Coastal villa)
4. LIGHTING: Create Instagram-worthy lighting setup
5. TECHNICAL: 85mm lens, natural depth, film aesthetic
6. MOOD: Match brand values and emotional tone
`
}

**USER GENDER: ${userGender}**
**USER TRIGGER WORD: ${triggerWord}** (you will NOT include this in prompts - it's added automatically by the system)

${
  referenceImageUrl
    ? `
**🎨 INSPIRATION IMAGE PROVIDED: ${referenceImageUrl}**

**CRITICAL: THIS IS NOT JUST A URL - YOU MUST ANALYZE THE ACTUAL IMAGE DETAILS FROM USER'S DESCRIPTION**

When a user uploads an inspiration image, they want photos of THEMSELVES that replicate the EXACT aesthetic.

**YOUR TASK:** Analyze what you can infer from the user's request and create concepts that capture:

1. **OUTFIT DETAILS** - If visible or described:
   - Exact garments (blazer, dress, top, pants, etc.)
   - Specific colors and fabrics
   - Accessories (jewelry, bags, hats, etc.)
   - How items are styled together

2. **LOCATION & SETTING** - Where the photo was taken:
   - Indoor or outdoor?
   - Urban street, cafe, office, home, nature?
   - Background elements (cars, storefronts, windows, etc.)

3. **LIGHTING STYLE**:
   - Natural daylight, sunset, overcast, indoor lighting?
   - Soft and diffused OR dramatic and contrasty?
   - Light direction and color temperature

4. **MOOD & COMPOSITION**:
   - Casual or formal vibe?
   - Candid street style OR posed editorial?
   - Close-up, half-body, or environmental shot?
   - Hair styling visible?

**IMPORTANT:** Create ${count} concepts where the USER (not a model) recreates this EXACT style in similar or varied settings. The user wants to look like the inspiration while being recognizably themselves.
`
    : ""
}

**CRITICAL BRAND STYLING (ALWAYS REQUIRED):**

1. **Brand Colors** - Use SPECIFIC colors from user's palette (not generic beige/blue)
2. **Visual Aesthetic** - Match their style preference (Scandinavian/Urban/Coastal)
3. **Fashion Intelligence** - Describe fabrics with luxury detail
4. **Gender Awareness** - Use appropriate descriptors for ${userGender}

**GENDER-AWARE LANGUAGE:**

For WOMEN:
- Hair: "cascading waves catching light", "sleek dark hair framing features"
- Style: "draped in", "adorned with", "enveloped in"
- Mood: "ethereal elegance", "sophisticated grace", "radiant confidence"

For MEN:
- Hair: "sharp styled cut", "textured modern style"
- Style: "tailored in", "structured", "clean lines"
- Mood: "commanding presence", "refined masculinity", "bold sophistication"

**FLUX PROMPT BEST PRACTICES:**

1. **DO NOT include trigger word** - The system adds it automatically (${triggerWord})
2. **Keep under 75 words** for optimal FLUX performance
3. **Structure**: Person → Outfit → Location → Lighting → Camera → Mood
4. **Be specific**: "85mm portrait lens" not "camera", "Rembrandt lighting" not "good lighting"
5. **Natural flow**: Integrate technical details poetically, not as list

**EXAMPLE - EXPLICIT USER REQUEST:**
User: "Hey Maya, can you create hyper-realistic portrait of me in silk slip dress at luxury rooftop bar during sunset"

MAYA'S PROMPT (trigger word NOT included):
"confident ${userGender} with luminous skin and cascading hair, wearing luxurious champagne silk slip dress with delicate straps catching golden light, standing at upscale rooftop bar with panoramic city skyline, warm sunset hour creating rich amber glow and soft shadows, 85mm portrait lens with dreamy bokeh, intimate editorial elegance meets urban sophistication"

**EXAMPLE - OPEN-ENDED USER REQUEST:**  
User: "Show me some beautiful concepts"

MAYA'S PROMPT (trigger word NOT included):
"serene ${userGender} with natural beauty and effortless style, enveloped in oversized ivory cashmere turtleneck and tailored sand linen trousers, standing in bright Scandinavian loft with floor-to-ceiling windows and natural wood, soft diffused morning light creating gentle warmth, 85mm lens with shallow depth, hygge meets editorial sophistication"

**EXAMPLE - INSPIRATION IMAGE REQUEST:**
User uploads photo of woman in black blazer with baseball cap holding coffee on urban street

MAYA'S PROMPT (trigger word NOT included):
"confident ${userGender} with long flowing hair and relaxed expression, wearing structured black oversized blazer over casual top with layered gold chain necklaces and black baseball cap, standing on busy urban street with storefronts and cars in background, holding coffee cup, natural daylight creating soft shadows, candid street style aesthetic, 50mm lens capturing authentic moment, effortless chic sophistication"

Generate ${count} concepts as JSON array. DO NOT include trigger word in prompts - it's added by the system:
[
  {
    "title": "Creative title",
    "description": "Warm description for user",
    "category": "Close-Up" | "Half Body" | "Lifestyle" | "Action" | "Environmental",
    "fashionIntelligence": "Specific styling details",
    "lighting": "Exact lighting setup",
    "location": "Specific location",
    "prompt": "FLUX-optimized prompt WITHOUT trigger word"
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
          textContent = `[User has uploaded an inspiration image: ${inspirationImageUrl}]

**IMPORTANT**: Analyze what you can infer from the user's request and create concepts that capture:

1. **OUTFIT DETAILS** - If visible or described:
   - Exact garments (blazer, dress, top, pants, etc.)
   - Specific colors and fabrics
   - Accessories (jewelry, bags, hats, etc.)
   - How items are styled together

2. **LOCATION & SETTING** - Where the photo was taken:
   - Indoor or outdoor?
   - Urban street, cafe, office, home, nature?
   - Background elements (cars, storefronts, windows, etc.)

3. **LIGHTING STYLE**:
   - Natural daylight, sunset, overcast, indoor lighting?
   - Soft and diffused OR dramatic and contrasty?
   - Light direction and color temperature

4. **MOOD & COMPOSITION**:
   - Casual or formal vibe?
   - Candid street style OR posed editorial?
   - Close-up, half-body, or environmental shot?
   - Hair styling visible?

**IMPORTANT:** Create ${5} concepts where the USER (not a model) recreates this EXACT style in similar or varied settings. The user wants to look like the inspiration while being recognizably themselves.
`
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
